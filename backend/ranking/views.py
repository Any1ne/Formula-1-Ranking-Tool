from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import StreamingHttpResponse, HttpResponse
from django.shortcuts import get_object_or_404
from .models import RankedObject, ExpertLog, PairwiseMatrix, Expert
from .serializers import (
    RankedObjectSerializer,
    ExpertLogSerializer,
    PairwiseMatrixSerializer,
    ExpertSerializer,
)
import csv, io, json, itertools, time, math


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


# --- LAB 3 & 4: STREAMING BRUTE FORCE CONSENSUS (NEW LOGIC) ---


def calculate_consensus_stream(expert_data, objects, obj_ids):
    """
    Генератор, який виконує повний перебір (brute force) і віддає прогрес.
    """
    n = len(obj_ids)
    total_permutations = math.factorial(n)

    # Pre-calculate data for speed
    prepared_experts = []
    for exp in expert_data:
        p_ranks = exp["ranks"]  # {obj_id: rank}

        # Build pair set for this expert (Winner, Loser)
        p_pairs = set()
        order = exp["order"]
        valid_order = [o for o in order if o in obj_ids]
        for i in range(len(valid_order)):
            for j in range(i + 1, len(valid_order)):
                p_pairs.add((valid_order[i], valid_order[j]))

        prepared_experts.append(
            {"weight": exp["weight"], "ranks": p_ranks, "pairs": p_pairs}
        )

    # Best tracking
    best_k1_r = {"val": float("inf"), "order": None}
    best_k2_r = {"val": float("inf"), "order": None}
    best_k1_h = {"val": float("inf"), "order": None}
    best_k2_h = {"val": float("inf"), "order": None}

    # Helper function for Hamming dist
    def get_hamming(cand_pairs, exp_pairs):
        return len(cand_pairs.symmetric_difference(exp_pairs))

    # Helper for Rank dist
    def get_rank_dist(cand_ranks, exp_ranks):
        d = 0
        for oid in obj_ids:
            r_exp = exp_ranks.get(oid, n + 1)
            d += abs(cand_ranks[oid] - r_exp)
        return d

    yield f"data: {json.dumps({'type': 'start', 'total': total_permutations})}\n\n"

    count = 0
    last_yield_time = time.time()

    # MAIN LOOP: Permutations
    for p_tuple in itertools.permutations(obj_ids):
        count += 1

        cand_order = list(p_tuple)
        cand_ranks = {oid: i + 1 for i, oid in enumerate(cand_order)}

        cand_pairs = set()
        for i in range(n):
            for j in range(i + 1, n):
                cand_pairs.add((cand_order[i], cand_order[j]))

        sum_rank = 0
        max_rank = 0
        sum_ham = 0
        max_ham = 0

        for exp in prepared_experts:
            dr = get_rank_dist(cand_ranks, exp["ranks"])
            dh = get_hamming(cand_pairs, exp["pairs"])

            w = exp["weight"]

            sum_rank += dr * w
            max_rank = max(max_rank, dr * w)
            sum_ham += dh * w
            max_ham = max(max_ham, dh * w)

        if sum_rank < best_k1_r["val"]:
            best_k1_r = {"val": sum_rank, "order": cand_order}
        if max_rank < best_k2_r["val"]:
            best_k2_r = {"val": max_rank, "order": cand_order}
        if sum_ham < best_k1_h["val"]:
            best_k1_h = {"val": sum_ham, "order": cand_order}
        if max_ham < best_k2_h["val"]:
            best_k2_h = {"val": max_ham, "order": cand_order}

        if count % 2000 == 0:
            now = time.time()
            if now - last_yield_time > 0.2:
                progress_data = {
                    "type": "progress",
                    "current": count,
                    "total": total_permutations,
                    "percent": round((count / total_permutations) * 100, 1),
                }
                yield f"data: {json.dumps(progress_data)}\n\n"
                last_yield_time = now

    # --- FINAL RESULT ---

    # Competence (Lab 4 logic using K1 Rank as center)
    center_order = best_k1_r["order"]
    center_ranks = {oid: i + 1 for i, oid in enumerate(center_order)}

    expert_metrics = []
    total_inv_dist = 0

    for expert_obj, prep in zip(expert_data, prepared_experts):
        dr = get_rank_dist(center_ranks, prep["ranks"])
        competence_raw = 1 / (1 + dr)
        total_inv_dist += competence_raw
        expert_metrics.append(
            {
                "expert_name": expert_obj["name"],
                "d_rank": dr,
                "raw_comp": competence_raw,
                "input_weight": prep["weight"],
            }
        )

    for em in expert_metrics:
        if total_inv_dist > 0:
            em["calculated_competence"] = round(em["raw_comp"] / total_inv_dist, 4)
        else:
            em["calculated_competence"] = 0

    def fmt(order):
        return [{"id": oid, "name": objects[oid].name} for oid in order]

    result_payload = {
        "type": "result",
        "rankings": {
            "k1_rank": fmt(best_k1_r["order"]),
            "k2_rank": fmt(best_k2_r["order"]),
            "k1_hamming": fmt(best_k1_h["order"]),
            "k2_hamming": fmt(best_k2_h["order"]),
        },
        "criteria": {
            "K1_rank": best_k1_r["val"],
            "K2_rank": best_k2_r["val"],
            "K1_hamming": best_k1_h["val"],
            "K2_hamming": best_k2_h["val"],
        },
        "expert_stats": expert_metrics,
    }

    yield f"data: {json.dumps(result_payload)}\n\n"


@api_view(["POST"])
def calculate_consensus(request):
    """
    Endpoint that initiates the streaming response.
    Expects: { "limit_objects": 8 (optional), "weights": {...} }
    """
    custom_weights = request.data.get("weights", {})
    limit = int(request.data.get("limit_objects", 0))

    all_objects = list(RankedObject.objects.all())

    # Safety slice
    if limit > 0 and len(all_objects) > limit:
        all_objects = all_objects[:limit]
    elif limit == 0 and len(all_objects) > 9:
        # Default cap if not specified to avoid timeouts during demo
        pass

    obj_ids = [o.id for o in all_objects]
    objects_map = {o.id: o for o in all_objects}

    experts_db = Expert.objects.all()
    expert_data = []

    for expert in experts_db:
        matrix_entry = (
            PairwiseMatrix.objects.filter(expert=expert).order_by("-created_at").first()
        )
        if not matrix_entry:
            continue

        data = json.loads(matrix_entry.matrix_json)
        order = [int(x) for x in data.get("order", [])]
        ranks_map = {oid: idx + 1 for idx, oid in enumerate(order)}

        expert_data.append(
            {
                "name": expert.name,
                "ranks": ranks_map,
                "order": order,
                "weight": float(custom_weights.get(str(expert.id), 1.0)),
            }
        )

    response = StreamingHttpResponse(
        calculate_consensus_stream(expert_data, objects_map, obj_ids),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    return response


# --- SHOWER EXPERT SYSTEM (Lab 5-8) ---
@api_view(["POST"])
def run_shower_inference(request):
    facts = request.data.get("facts", {})

    # Отримуємо факти (з врахуванням нових f9, f10)
    f1 = facts.get("f1", False)  # Cold water available
    f2 = facts.get("f2", False)  # Hot water available
    f3 = facts.get("f3", False)  # Norm temp
    f4 = facts.get("f4", False)  # Low temp
    f5 = facts.get("f5", False)  # High temp
    f6 = facts.get("f6", False)  # Limit Cold MIN (0%)
    f7 = facts.get("f7", False)  # Limit Hot MIN (0%)
    f8 = facts.get("f8", 1)  # Priority
    f9 = facts.get("f9", False)  # Limit Cold MAX (100%) - NEW
    f10 = facts.get("f10", False)  # Limit Hot MAX (100%) - NEW

    logs = []
    action_performed = "NONE"
    updated_facts = facts.copy()

    explanation = {
        "active": False,
        "rule_name": "",
        "condition_text": "",
        "reasoning": "",
    }

    logs.append("--- [v3.3] Початок циклу вирішувача ---")

    # --- ПРАВИЛО П0: Аварія водопостачання ---
    logs.append("Аналіз П0: (Чи є взагалі вода?)")
    if not f1 and not f2:
        logs.append("-> П0 АКТИВОВАНО: АВАРІЯ")
        action_performed = "ALARM_NO_WATER"
        explanation = {
            "active": True,
            "rule_name": "Продукція №0 (Аварія)",
            "condition_text": "Немає холодної (¬f1) І Немає гарячої (¬f2)",
            "reasoning": "Критична ситуація: відсутнє водопостачання. Система не може регулювати температуру.",
        }
        return Response(
            {
                "facts": updated_facts,
                "logs": logs,
                "action": action_performed,
                "explanation": explanation,
            }
        )

    # --- ПРАВИЛО П5: Захист від опіків ---
    logs.append("Аналіз П5: (Небезпека опіку?)")
    # Якщо гаряче і немає холодної води, щоб розбавити - закриваємо гарячу (якщо вона не закрита)
    if f5 and not f1 and not f7:
        logs.append("-> П5 АКТИВОВАНО: ЕКСТРЕНЕ ВІДКЛЮЧЕННЯ")
        action_performed = "EMERGENCY_CLOSE_HOT"
        updated_facts["f5"] = False
        explanation = {
            "active": True,
            "rule_name": "Продукція №5 (Захист від опіків)",
            "condition_text": "Температура висока (f5) І Немає холодної води (¬f1)",
            "reasoning": "Увага! Вода гаряча, а холодна вода відсутня. Екстрене перекриття гарячої води.",
        }
        return Response(
            {
                "facts": updated_facts,
                "logs": logs,
                "action": action_performed,
                "explanation": explanation,
            }
        )

    # ==========================
    # БЛОК РЕГУЛЮВАННЯ ТЕМПЕРАТУРИ
    # ==========================

    # --- СЦЕНАРІЙ: ДУЖЕ ХОЛОДНО (f4) ---
    if f4:
        # Спроба 1: Відкрити гарячу (П1)
        # Умова: Гаряча вода є (f2) І Вентиль гарячої НЕ на максимумі (¬f10)
        logs.append(f"Аналіз П1 (Open Hot): f4={f4}, f10(HotMax)={f10}")
        if not f10:
            if f2:
                logs.append("-> П1 АКТИВОВАНО (Відкриваємо гарячу)")
                action_performed = "OPEN_HOT"
                updated_facts["f4"] = False  # Optimistic update
                updated_facts["f3"] = True
                explanation = {
                    "active": True,
                    "rule_name": "Продукція №1 (Нагрів / Open Hot)",
                    "condition_text": "Холодно (f4) І Гаряча не Макс (¬f10)",
                    "reasoning": "Вода холодна. Вентиль гарячої води ще не відкритий повністю, тому відкриваємо його більше.",
                }
                return Response(
                    {
                        "facts": updated_facts,
                        "logs": logs,
                        "action": action_performed,
                        "explanation": explanation,
                    }
                )
            else:
                logs.append("-> П1 пропущено: немає гарячої води (f2=False)")
        else:
            logs.append("-> П1 пропущено: гаряча вода вже на МАКСИМУМІ")

        # Спроба 2: Закрити холодну (П4) - якщо П1 не спрацював (наприклад, гаряча на макс)
        # Умова: Вентиль холодної НЕ на мінімумі (¬f6)
        logs.append(f"Аналіз П4 (Close Cold): f4={f4}, f6(ColdMin)={f6}")
        if not f6:
            logs.append("-> П4 АКТИВОВАНО (Закриваємо холодну)")
            action_performed = "CLOSE_COLD"
            updated_facts["f4"] = False
            updated_facts["f3"] = True
            explanation = {
                "active": True,
                "rule_name": "Продукція №4 (Нагрів / Close Cold)",
                "condition_text": "Холодно (f4) І Холодна не Мін (¬f6)",
                "reasoning": "Вода холодна, але гарячу додати неможливо (або її немає). Тому зменшуємо потік холодної води.",
            }
            return Response(
                {
                    "facts": updated_facts,
                    "logs": logs,
                    "action": action_performed,
                    "explanation": explanation,
                }
            )

    # --- СЦЕНАРІЙ: ДУЖЕ ГАРЯЧЕ (f5) ---
    if f5:
        # Спроба 1: Відкрити холодну (П2)
        # Умова: Холодна вода є (f1) І Вентиль холодної НЕ на максимумі (¬f9)
        logs.append(f"Аналіз П2 (Open Cold): f5={f5}, f9(ColdMax)={f9}")
        if not f9:
            if f1:
                logs.append("-> П2 АКТИВОВАНО (Відкриваємо холодну)")
                action_performed = "OPEN_COLD"
                updated_facts["f5"] = False
                updated_facts["f3"] = True
                explanation = {
                    "active": True,
                    "rule_name": "Продукція №2 (Охолодження / Open Cold)",
                    "condition_text": "Гаряче (f5) І Холодна не Макс (¬f9)",
                    "reasoning": "Вода гаряча. Вентиль холодної води ще має запас ходу, тому відкриваємо його більше.",
                }
                return Response(
                    {
                        "facts": updated_facts,
                        "logs": logs,
                        "action": action_performed,
                        "explanation": explanation,
                    }
                )
            else:
                logs.append("-> П2 пропущено: немає холодної води (f1=False)")
        else:
            logs.append("-> П2 пропущено: холодна вода вже на МАКСИМУМІ")

        # Спроба 2: Закрити гарячу (П3)
        # Умова: Вентиль гарячої НЕ на мінімумі (¬f7)
        logs.append(f"Аналіз П3 (Close Hot): f5={f5}, f7(HotMin)={f7}")
        if not f7:
            logs.append("-> П3 АКТИВОВАНО (Закриваємо гарячу)")
            action_performed = "CLOSE_HOT"
            updated_facts["f5"] = False
            updated_facts["f3"] = True
            explanation = {
                "active": True,
                "rule_name": "Продукція №3 (Охолодження / Close Hot)",
                "condition_text": "Гаряче (f5) І Гаряча не Мін (¬f7)",
                "reasoning": "Вода гаряча, але холодну додати неможливо. Тому зменшуємо потік гарячої води.",
            }
            return Response(
                {
                    "facts": updated_facts,
                    "logs": logs,
                    "action": action_performed,
                    "explanation": explanation,
                }
            )

    # --- СТАН РІВНОВАГИ ---
    logs.append("Стан рівноваги (або неможливість дії).")
    explanation = {
        "active": False,
        "rule_name": "Стан спокою",
        "condition_text": "Всі параметри в нормі або досягнуто лімітів",
        "reasoning": "Система працює стабільно або вичерпала можливості регулювання.",
    }

    return Response(
        {
            "facts": updated_facts,
            "logs": logs,
            "action": "NONE",
            "explanation": explanation,
        }
    )
