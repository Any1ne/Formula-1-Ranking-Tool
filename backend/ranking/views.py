from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import RankedObject, ExpertLog, PairwiseMatrix, Expert
from .serializers import (
    RankedObjectSerializer,
    ExpertLogSerializer,
    PairwiseMatrixSerializer,
    ExpertSerializer,
)
import csv, io, json
from django.http import HttpResponse


# --- EXPERTS ---
@api_view(["GET", "POST"])
def experts_list_create(request):
    if request.method == "GET":
        experts = Expert.objects.all().order_by("name")
        serializer = ExpertSerializer(experts, many=True)
        return Response(serializer.data)
    elif request.method == "POST":
        serializer = ExpertSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# --- OBJECTS ---
@api_view(["GET", "POST"])
def objects_list_create(request):
    if request.method == "GET":
        objs = RankedObject.objects.all().order_by("-created_at")
        serializer = RankedObjectSerializer(objs, many=True)
        return Response(serializer.data)
    else:
        serializer = RankedObjectSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        ExpertLog.objects.create(
            action="create_object", payload=json.dumps(serializer.data)
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def upload_csv(request):
    f = request.FILES.get("file")
    if not f:
        return Response({"error": "no file"}, status=400)
    data = f.read().decode("utf-8")
    reader = csv.reader(io.StringIO(data))
    created = []
    for row in reader:
        if not row:
            continue
        name = row[0].strip()
        if name:
            obj, _ = RankedObject.objects.get_or_create(name=name)
            created.append(obj)
    ExpertLog.objects.create(
        action="upload_csv", payload=json.dumps({"created": [o.id for o in created]})
    )
    serializer = RankedObjectSerializer(created, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def load_sample_objects(request):
    sample = [
        "Mercedes",
        "Red Bull",
        "Ferrari",
        "McLaren",
        "Alpine",
        "Aston Martin",
        "AlphaTauri",
        "Williams",
        "Haas",
        "Alfa Romeo",
        "Sauber",
        "Toro Rosso",
    ]
    created = []
    for name in sample:
        o, _ = RankedObject.objects.get_or_create(name=name)
        created.append(o)
    ExpertLog.objects.create(
        action="load_sample", payload=json.dumps({"count": len(created)})
    )
    serializer = RankedObjectSerializer(created, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def clear_objects(request):
    RankedObject.objects.all().delete()
    ExpertLog.objects.create(
        action="clear_objects", payload=json.dumps({"status": "cleared"})
    )
    return Response({"status": "cleared"})


# --- RANKING ---
@api_view(["POST"])
def save_ranking(request):
    data = request.data
    order = data.get("order", [])
    expert_id = data.get("expertId")  # Тепер приймаємо ID

    if not order or not expert_id:
        return Response({"error": "order or expertId missing"}, status=400)

    try:
        expert = Expert.objects.get(id=expert_id)
    except Expert.DoesNotExist:
        return Response({"error": "Expert not found"}, status=404)

    ExpertLog.objects.create(
        action="save_ranking",
        payload=json.dumps({"expert": expert.name, "order": order}),
    )

    n = len(order)
    pairs = []
    for i in range(n):
        for j in range(i + 1, n):
            pairs.append([int(order[i]), int(order[j]), 1])

    matrix_data = {
        "n": n,
        "order": order,
        "pairs": pairs,
        "ranks": {obj_id: idx + 1 for idx, obj_id in enumerate(order)},
    }

    pm = PairwiseMatrix.objects.create(
        expert=expert, matrix_json=json.dumps(matrix_data)
    )
    serializer = PairwiseMatrixSerializer(pm)
    return Response(serializer.data)


@api_view(["GET"])
def logs_list(request):
    logs = ExpertLog.objects.all().order_by("-timestamp")[:200]
    serializer = ExpertLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def latest_matrix(request):
    matrices = PairwiseMatrix.objects.all().order_by("-created_at")
    serializer = PairwiseMatrixSerializer(matrices, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def collective_matrix_csv(request):
    all_objects = RankedObject.objects.all()
    all_rankings = PairwiseMatrix.objects.all().order_by("created_at")

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="collective_ranks.csv"'

    writer = csv.writer(response)
    # Header: Object Name, Expert Name...
    header = ["Object ID", "Object Name"] + [
        f"{r.expert.name} ({r.created_at.strftime('%H:%M')})" for r in all_rankings
    ]
    writer.writerow(header)

    for obj in all_objects:
        row = [obj.id, obj.name]
        for ranking in all_rankings:
            data = json.loads(ranking.matrix_json)
            try:
                rank = data["order"].index(obj.id) + 1
            except ValueError:
                rank = "-"
            row.append(rank)
        writer.writerow(row)

    return response
