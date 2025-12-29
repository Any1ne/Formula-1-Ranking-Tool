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


# --- LAB 3 & 4: CONSENSUS & COMPETENCE ---
@api_view(["POST"])
def calculate_consensus(request):
    """
    Labs 3 & 4:
    - Calculates Weighted Consensus (Borda)
    - Calculates Distances
    - Calculates derived Competence based on distances
    """
    # Get custom weights from request if provided, e.g. {"1": 0.5, "2": 1.0} where keys are expert IDs
    custom_weights = request.data.get("weights", {})

    all_objects = list(RankedObject.objects.all())
    obj_ids = [o.id for o in all_objects]
    experts = Expert.objects.all()

    expert_data = []

    # 1. Collect Data
    for expert in experts:
        matrix_entry = (
            PairwiseMatrix.objects.filter(expert=expert).order_by("-created_at").first()
        )
        if not matrix_entry:
            continue

        data = json.loads(matrix_entry.matrix_json)
        order = data.get("order", [])

        ranks_map = {}
        max_rank = len(obj_ids) + 1

        for oid in obj_ids:
            try:
                r = order.index(oid) + 1
            except ValueError:
                r = max_rank
            ranks_map[oid] = r

        # Get weight (default 1.0)
        weight = float(custom_weights.get(str(expert.id), 1.0))

        expert_data.append(
            {
                "id": expert.id,
                "name": expert.name,
                "ranks": ranks_map,
                "order": order,
                "weight": weight,
            }
        )

    if not expert_data:
        return Response({"error": "No expert data found"}, status=400)

    # 2. Weighted Borda Count (Consensus)
    obj_scores = {oid: 0 for oid in obj_ids}

    for exp in expert_data:
        for oid, rank in exp["ranks"].items():
            # LAB 4: Score is multiplied by Expert Weight
            obj_scores[oid] += rank * exp["weight"]

    consensus_order_ids = sorted(obj_scores.keys(), key=lambda oid: obj_scores[oid])
    consensus_ranks = {oid: i + 1 for i, oid in enumerate(consensus_order_ids)}

    # 3. Calculate Distances & Derived Competence
    results = []

    def get_pairwise_vector(order_ids, all_ids):
        vec = {}
        n = len(all_ids)
        for i in range(n):
            for j in range(i + 1, n):
                id_a = all_ids[i]
                id_b = all_ids[j]
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

    # First pass: calculate distances
    for exp in expert_data:
        d_rank = 0
        for oid in obj_ids:
            d_rank += abs(exp["ranks"][oid] - consensus_ranks[oid])

        exp_vec = get_pairwise_vector(exp["order"], obj_ids)
        d_hamming = 0
        for key in consensus_vec:
            d_hamming += abs(exp_vec[key] - consensus_vec[key])

        exp["d_rank"] = d_rank
        exp["d_hamming"] = d_hamming

        total_rank_distance += d_rank
        total_hamming_distance += d_hamming

    # LAB 4: Calculate Competence Coefficient (normalized inverse distance)
    # Using d_rank as base metric. +1 to avoid division by zero.
    sum_inverse_dist = sum([1 / (e["d_rank"] + 1) for e in expert_data])

    for exp in expert_data:
        # Derived competence
        comp_coef = (
            (1 / (exp["d_rank"] + 1)) / sum_inverse_dist if sum_inverse_dist > 0 else 0
        )

        results.append(
            {
                "expert_id": exp["id"],
                "expert": exp["name"],
                "d_rank": exp["d_rank"],
                "d_hamming": exp["d_hamming"],
                "input_weight": exp["weight"],
                "calculated_competence": round(comp_coef, 4),
            }
        )

    # 4. Response
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
            "K1_rank": total_rank_distance,
            "K1_hamming": total_hamming_distance,
        },
    }

    return Response(response_data)


# --- LAB 6: SHOWER EXPERT SYSTEM ---


@api_view(["POST"])
def run_shower_inference(request):
    """
    Вирішувач (Inference Engine) для системи керування душем.
    Приймає поточні факти (Робоча Пам'ять), повертає результат одного кроку.
    """
    facts = request.data.get("facts", {})

    # Розпакування фактів для зручності
    # f1: Є холодна, f2: Є гаряча
    # f3: Норма, f4: Холодно, f5: Гаряче
    # f6: Limit Cold, f7: Limit Hot
    # f8: Крок

    f1 = facts.get("f1", False)
    f2 = facts.get("f2", False)
    f3 = facts.get("f3", False)
    f4 = facts.get("f4", False)
    f5 = facts.get("f5", False)
    f6 = facts.get("f6", False)
    f7 = facts.get("f7", False)
    f8 = facts.get("f8", 1)

    logs = []
    action_performed = None
    updated_facts = facts.copy()

    logs.append("--- Початок циклу вирішувача ---")

    # --- БАЗА ПРАВИЛ (PRODUCTIONS) ---

    # Продукція 1: Якщо холодно (f4) і гарячий вентиль не на межі (!f7) -> Відкрити Гарячу
    logs.append("Перевірка П1: (Low Temp AND Not Limit Hot)")
    if f4 and not f7:
        if f2:  # Перевірка ядра (чи є гаряча вода)
            logs.append("-> П1 АКТИВОВАНО: Відкриваємо вентиль гарячої води")
            action_performed = "OPEN_HOT"
            # Симуляція наслідків (змінюємо факти)
            updated_facts["f4"] = False  # Вже не холодно
            updated_facts["f3"] = True  # Стало норм
            updated_facts["f5"] = False
            return Response(
                {"facts": updated_facts, "logs": logs, "action": action_performed}
            )
        else:
            logs.append("-> П1: Умова вірна, але немає гарячої води (f2=0)")

    # Продукція 2: Якщо гаряче (f5) і холодний вентиль не на межі (!f6) -> Відкрити Холодну
    logs.append("Перевірка П2: (High Temp AND Not Limit Cold)")
    if f5 and not f6:
        if f1:  # Перевірка ядра
            logs.append("-> П2 АКТИВОВАНО: Відкриваємо вентиль холодної води")
            action_performed = "OPEN_COLD"
            # Симуляція наслідків
            updated_facts["f5"] = False  # Вже не гаряче
            updated_facts["f3"] = True  # Стало норм
            updated_facts["f4"] = False
            return Response(
                {"facts": updated_facts, "logs": logs, "action": action_performed}
            )
        else:
            logs.append("-> П2: Умова вірна, але немає холодної води (f1=0)")

    # Продукція 3: Якщо гаряче (f5) і гарячий вентиль не на межі (!f7) -> Закрити Гарячу
    logs.append("Перевірка П3: (High Temp AND Not Limit Hot)")
    if f5 and not f7:
        logs.append("-> П3 АКТИВОВАНО: Закриваємо вентиль гарячої води")
        action_performed = "CLOSE_HOT"
        updated_facts["f5"] = False
        updated_facts["f3"] = True
        return Response(
            {"facts": updated_facts, "logs": logs, "action": action_performed}
        )

    # Продукція 4: Якщо холодно (f4) і холодний вентиль не на межі (!f6) -> Закрити Холодну
    logs.append("Перевірка П4: (Low Temp AND Not Limit Cold)")
    if f4 and not f6:
        logs.append("-> П4 АКТИВОВАНО: Закриваємо вентиль холодної води")
        action_performed = "CLOSE_COLD"
        updated_facts["f4"] = False
        updated_facts["f3"] = True
        return Response(
            {"facts": updated_facts, "logs": logs, "action": action_performed}
        )

    logs.append("Жодне правило не спрацювало. Система в рівновазі або ціль досягнута.")
    return Response({"facts": updated_facts, "logs": logs, "action": "NONE"})
