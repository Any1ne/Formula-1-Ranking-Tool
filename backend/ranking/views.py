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
from django.shortcuts import get_object_or_404


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


@api_view(["GET"])
def get_expert_ranking(request, expert_id):
    expert = get_object_or_404(Expert, id=expert_id)
    ranking = (
        PairwiseMatrix.objects.filter(expert=expert).order_by("-created_at").first()
    )

    if not ranking:
        return Response({"order": []}, status=200)

    matrix_data = json.loads(ranking.matrix_json)
    return Response({"order": matrix_data.get("order", [])}, status=200)


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
    expert_id = data.get("expertId")

    if not order or not expert_id:
        return Response({"error": "order or expertId missing"}, status=400)

    try:
        expert = Expert.objects.get(id=expert_id)
    except Expert.DoesNotExist:
        return Response({"error": "Expert not found"}, status=404)

    ExpertLog.objects.create(
        expert=expert,
        action="save_ranking",
        payload=json.dumps({"order": order}),
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


# --- LAB 3: CONSENSUS CALCULATION ---
@api_view(["GET"])
def calculate_consensus(request):
    """
    Lab 3: Calculate consensus ranking and distances (Kemeny/Hamming).
    Uses Borda Count (Sum of Ranks) as the compromise heuristic.
    """
    all_objects = list(RankedObject.objects.all())
    obj_ids = [o.id for o in all_objects]
    experts = Expert.objects.all()

    expert_data = []  # Stores {name, ranks: {obj_id: rank}, vector: []}

    # 1. Collect latest rankings from all experts
    for expert in experts:
        matrix_entry = (
            PairwiseMatrix.objects.filter(expert=expert).order_by("-created_at").first()
        )
        if not matrix_entry:
            continue

        data = json.loads(matrix_entry.matrix_json)
        order = data.get("order", [])

        # Map obj_id -> rank. If object missing, assign max_rank + 1 (penalty)
        ranks_map = {}
        max_rank = len(obj_ids) + 1

        for oid in obj_ids:
            try:
                # ranks are 1-based
                r = order.index(oid) + 1
            except ValueError:
                r = max_rank
            ranks_map[oid] = r

        expert_data.append(
            {
                "id": expert.id,
                "name": expert.name,
                "ranks": ranks_map,
                "order": order,  # raw order for pair comparisons
            }
        )

    if not expert_data:
        return Response({"error": "No expert data found"}, status=400)

    # 2. Calculate Consensus (Method: Sum of Ranks / Borda)
    # This minimizes sum of squared rank differences, proxy for L1.
    obj_scores = {oid: 0 for oid in obj_ids}

    for exp in expert_data:
        for oid, rank in exp["ranks"].items():
            obj_scores[oid] += rank

    # Sort objects by score (lower score = better rank)
    consensus_order_ids = sorted(obj_scores.keys(), key=lambda oid: obj_scores[oid])

    # Create rank map for consensus
    consensus_ranks = {oid: i + 1 for i, oid in enumerate(consensus_order_ids)}

    # 3. Calculate Distances (Metrics)
    results = []

    # Helper for Pairwise (Hamming) Distance
    def get_pairwise_vector(order_ids, all_ids):
        # Returns vector of signs: 1 if i>j, -1 if j>i, 0 otherwise
        vec = {}
        n = len(all_ids)
        for i in range(n):
            for j in range(i + 1, n):
                id_a = all_ids[i]
                id_b = all_ids[j]

                # Check positions in the specific order
                try:
                    idx_a = order_ids.index(id_a)
                except ValueError:
                    idx_a = 999

                try:
                    idx_b = order_ids.index(id_b)
                except ValueError:
                    idx_b = 999

                val = 0
                if idx_a < idx_b:
                    val = 1
                elif idx_b < idx_a:
                    val = -1

                vec[f"{id_a}-{id_b}"] = val
        return vec

    consensus_vec = get_pairwise_vector(consensus_order_ids, obj_ids)

    total_rank_distance = 0
    total_hamming_distance = 0
    max_rank_distance = 0

    for exp in expert_data:
        # A. Rank Distance (Spearman Footrule L1): Sum |rank_i - rank_consensus_i|
        d_rank = 0
        for oid in obj_ids:
            d_rank += abs(exp["ranks"][oid] - consensus_ranks[oid])

        # B. Hamming Distance on Pairs: Sum |b_lk^i - b_lk^consensus|
        exp_vec = get_pairwise_vector(exp["order"], obj_ids)
        d_hamming = 0
        for key in consensus_vec:
            d_hamming += abs(exp_vec[key] - consensus_vec[key])

        results.append(
            {"expert": exp["name"], "d_rank": d_rank, "d_hamming": d_hamming}
        )

        total_rank_distance += d_rank
        total_hamming_distance += d_hamming
        if d_rank > max_rank_distance:
            max_rank_distance = d_rank

    # 4. Prepare Response
    response_data = {
        "consensus_order": [
            {
                "id": oid,
                "name": RankedObject.objects.get(id=oid).name,
                "score": obj_scores[oid],
            }
            for oid in consensus_order_ids
        ],
        "expert_distances": results,
        "criteria": {
            "K1_rank (Additive)": total_rank_distance,
            "K2_rank (Minimax)": max_rank_distance,
            "K1_hamming": total_hamming_distance,
        },
    }

    return Response(response_data)
