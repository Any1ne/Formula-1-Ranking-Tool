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
        expert=expert, action="save_ranking", payload=json.dumps({"order": order})
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


# --- CORE LOGIC ---


def generate_matrix(ranks_map, obj_ids):
    """Generates an NxN matrix (1, -1, 0) for the given objects based on ranks."""
    size = len(obj_ids)
    # 0 = diagonal, 1 = row prefers col (strict: row < col rank), -1 = col prefers row
    # Note: Lab definition might vary, but usually bij=1 if object i > object j.
    # Here, rank 1 is 'best'. So if rank(i) < rank(j), i is preferred.
    matrix = [[0] * size for _ in range(size)]
    for r in range(size):
        for c in range(size):
            if r == c:
                continue
            id_a = obj_ids[r]
            id_b = obj_ids[c]
            rank_a = ranks_map.get(id_a, float("inf"))
            rank_b = ranks_map.get(id_b, float("inf"))

            if rank_a < rank_b:
                matrix[r][c] = 1
            elif rank_b < rank_a:
                matrix[r][c] = -1
    return matrix


def calculate_consensus_stream(expert_data, objects, obj_ids):
    start_time = time.time()
    n = len(obj_ids)
    total_permutations = math.factorial(n)

    # Yield initial log
    yield f"data: {json.dumps({'type': 'log', 'message': f'Starting consensus calculation for {n} objects.'})}\n\n"
    yield f"data: {json.dumps({'type': 'log', 'message': f'Total permutations to check: {total_permutations}'})}\n\n"
    yield f"data: {json.dumps({'type': 'log', 'message': f'Active experts: {len(expert_data)}'})}\n\n"

    prepared_experts = []
    for exp in expert_data:
        p_ranks = exp["ranks"]
        p_pairs = set()
        order = exp["order"]
        valid_order = [o for o in order if o in obj_ids]
        for i in range(len(valid_order)):
            for j in range(i + 1, len(valid_order)):
                p_pairs.add((valid_order[i], valid_order[j]))
        prepared_experts.append(
            {
                "weight": exp["weight"],
                "ranks": p_ranks,
                "pairs": p_pairs,
                "name": exp["name"],
            }
        )

    # Trackers
    best_k1_r = {"val": float("inf"), "solutions": []}
    best_k2_r = {"val": float("inf"), "solutions": []}
    best_k1_h = {"val": float("inf"), "solutions": []}
    best_k2_h = {"val": float("inf"), "solutions": []}

    def get_hamming(cand_pairs, exp_pairs):
        return len(cand_pairs.symmetric_difference(exp_pairs))

    def get_rank_dist(cand_ranks, exp_ranks):
        d = 0
        for oid in obj_ids:
            r_exp = exp_ranks.get(oid, n + 1)
            d += abs(cand_ranks[oid] - r_exp)
        return d

    yield f"data: {json.dumps({'type': 'start', 'total': total_permutations})}\n\n"

    count = 0
    last_yield_time = time.time()

    for p_tuple in itertools.permutations(obj_ids):
        count += 1
        cand_order = list(p_tuple)
        cand_ranks = {oid: i + 1 for i, oid in enumerate(cand_order)}

        cand_pairs = set()
        for i in range(n):
            for j in range(i + 1, n):
                cand_pairs.add((cand_order[i], cand_order[j]))

        d_ranks_vector = []
        d_hams_vector = []

        sum_rank = 0
        max_rank = 0
        sum_ham = 0
        max_ham = 0

        for exp in prepared_experts:
            dr = get_rank_dist(cand_ranks, exp["ranks"])
            dh = get_hamming(cand_pairs, exp["pairs"])

            d_ranks_vector.append(dr)
            d_hams_vector.append(dh)

            w = exp["weight"]
            sum_rank += dr * w
            sum_ham += dh * w

            max_rank = max(max_rank, dr)
            max_ham = max(max_ham, dh)

        def update_best(tracker, val, order, dists):
            if val < tracker["val"]:
                tracker["val"] = val
                tracker["solutions"] = [
                    {"order": list(order), "distances": list(dists)}
                ]
            elif val == tracker["val"]:
                tracker["solutions"].append(
                    {"order": list(order), "distances": list(dists)}
                )

        update_best(best_k1_r, sum_rank, cand_order, d_ranks_vector)
        update_best(best_k2_r, max_rank, cand_order, d_ranks_vector)
        update_best(best_k1_h, sum_ham, cand_order, d_hams_vector)
        update_best(best_k2_h, max_ham, cand_order, d_hams_vector)

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

    # Log completion
    end_time = time.time()
    total_time = end_time - start_time
    yield f"data: {json.dumps({'type': 'log', 'message': f'Calculation finished in {total_time:.4f} seconds.'})}\n\n"

    # --- FINAL PROCESSING ---

    def fmt(order):
        return [{"id": oid, "name": objects[oid].name} for oid in order]

    def process_tracker_results(tracker):
        final_solutions = []

        for sol in tracker["solutions"]:
            formatted_order = fmt(sol["order"])
            center_ranks = {oid: i + 1 for i, oid in enumerate(sol["order"])}

            local_metrics = []
            total_inv_dist = 0

            for exp in prepared_experts:
                dist = get_rank_dist(center_ranks, exp["ranks"])
                raw_comp = 1 / (1 + dist)
                total_inv_dist += raw_comp

                local_metrics.append(
                    {
                        "expert_name": exp["name"],
                        "d_rank": dist,
                        "raw_competence": raw_comp,
                        "original_weight": exp["weight"],
                    }
                )

            expert_stats = []
            for em in local_metrics:
                norm_comp = 0
                if total_inv_dist > 0:
                    norm_comp = em["raw_competence"] / total_inv_dist

                expert_stats.append(
                    {
                        "expert_name": em.get("expert_name"),
                        "d_rank": em.get("d_rank"),
                        "input_weight": em.get(
                            "original_weight"
                        ),  # Ensure input weight is here
                        "calculated_competence": round(norm_comp, 4),
                    }
                )

            final_solutions.append(
                {
                    "order": formatted_order,
                    "distances": sol["distances"],
                    "expert_stats": expert_stats,
                }
            )

        return final_solutions

    # Prepare Inputs with Matrix
    input_rankings_display = []
    for exp in expert_data:
        valid_order_ids = [o for o in exp["order"] if o in obj_ids]
        # Generate NxN matrix for this specific subset of objects
        mat = generate_matrix(exp["ranks"], obj_ids)
        input_rankings_display.append(
            {
                "expert_name": exp["name"],
                "order": fmt(valid_order_ids),
                "matrix": mat,
            }
        )

    result_payload = {
        "type": "result",
        "inputs": input_rankings_display,
        "expert_names": [e["name"] for e in prepared_experts],
        "objects_header": [objects[oid].name for oid in obj_ids],  # For matrix headers
        "execution_time": total_time,
        "rankings": {
            "k1_rank": process_tracker_results(best_k1_r),
            "k2_rank": process_tracker_results(best_k2_r),
            "k1_hamming": process_tracker_results(best_k1_h),
            "k2_hamming": process_tracker_results(best_k2_h),
        },
        "criteria": {
            "k1_rank": best_k1_r["val"],
            "k2_rank": best_k2_r["val"],
            "k1_hamming": best_k1_h["val"],
            "k2_hamming": best_k2_h["val"],
        },
    }

    yield f"data: {json.dumps(result_payload)}\n\n"


@api_view(["POST"])
def calculate_consensus(request):
    custom_weights = request.data.get("weights", {})
    limit = int(request.data.get("limit_objects", 0))
    all_objects = list(RankedObject.objects.all())
    if limit > 0 and len(all_objects) > limit:
        all_objects = all_objects[:limit]
    elif limit == 0 and len(all_objects) > 9:
        pass
    obj_ids = [o.id for o in all_objects]
    objects_map = {o.id: o for o in all_objects}
    experts_db = Expert.objects.all()
    expert_data = []
    for expert in experts_db:
        matrix = (
            PairwiseMatrix.objects.filter(expert=expert).order_by("-created_at").first()
        )
        if not matrix:
            continue
        data = json.loads(matrix.matrix_json)
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


@api_view(["POST"])
def run_shower_inference(request):
    facts = request.data.get("facts", {})
    f1, f2, f3, f4 = facts.get("f1"), facts.get("f2"), facts.get("f3"), facts.get("f4")
    f5, f6, f7 = facts.get("f5"), facts.get("f6"), facts.get("f7")
    logs = ["--- [Classic Lab 5] ---"]
    updated_facts = facts.copy()
    if f7:
        return Response(
            {
                "facts": updated_facts,
                "logs": logs,
                "action": "NONE",
                "explanation": {"active": False, "reasoning": "Norm."},
            }
        )
    if (not f4) and (not f7) and f1 and f5:
        return Response(
            {
                "facts": {**updated_facts, "f5": False, "f7": True},
                "logs": logs,
                "action": "OPEN_COLD",
                "explanation": {"active": True, "reasoning": "Hot->Open Cold"},
            }
        )
    if (not f3) and (not f7) and f2 and f6:
        return Response(
            {
                "facts": {**updated_facts, "f6": False, "f7": True},
                "logs": logs,
                "action": "OPEN_HOT",
                "explanation": {"active": True, "reasoning": "Cold->Open Hot"},
            }
        )
    if f4 and (not f7) and f1 and f2 and f5:
        return Response(
            {
                "facts": {**updated_facts, "f5": False, "f7": True},
                "logs": logs,
                "action": "CLOSE_HOT",
                "explanation": {"active": True, "reasoning": "Hot+ColdMax->Close Hot"},
            }
        )
    if f3 and (not f7) and f1 and f2 and f6:
        return Response(
            {
                "facts": {**updated_facts, "f6": False, "f7": True},
                "logs": logs,
                "action": "CLOSE_COLD",
                "explanation": {"active": True, "reasoning": "Cold+HotMax->Close Cold"},
            }
        )
    return Response(
        {
            "facts": updated_facts,
            "logs": logs,
            "action": "NONE",
            "explanation": {"active": False, "reasoning": "No rule"},
        }
    )
