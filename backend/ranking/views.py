from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import RankedObject, ExpertLog, PairwiseMatrix
from .serializers import RankedObjectSerializer, ExpertLogSerializer, PairwiseMatrixSerializer
import csv, io, json
from django.views.decorators.csrf import csrf_exempt


@api_view(['GET', 'POST'])
def objects_list_create(request):
    if request.method == 'GET':
        objs = RankedObject.objects.all().order_by('-created_at')
        serializer = RankedObjectSerializer(objs, many=True)
        return Response(serializer.data)
    else:
        serializer = RankedObjectSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        ExpertLog.objects.create(action='create_object', payload=json.dumps(serializer.data))
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def upload_csv(request):
    # expects multipart form with 'file'
    f = request.FILES.get('file')
    if not f:
        return Response({'error': 'no file'}, status=400)
    data = f.read().decode('utf-8')
    reader = csv.reader(io.StringIO(data))
    created = []
    for row in reader:
        if not row: continue
        name = row[0].strip()
        if name:
            obj = RankedObject.objects.create(name=name)
            created.append(obj)
    ExpertLog.objects.create(action='upload_csv', payload=json.dumps({'created': [o.id for o in created]}))
    serializer = RankedObjectSerializer(created, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def load_sample_objects(request):
    # load built-in sample (12 F1 teams)
    sample = [
    'Mercedes', 'Red Bull', 'Ferrari', 'McLaren', 'Alpine', 'Aston Martin',
    'AlphaTauri', 'Williams', 'Haas', 'Alfa Romeo', 'Sauber', 'Toro Rosso'
    ]
    created = []
    for name in sample:
        o, _ = RankedObject.objects.get_or_create(name=name)
        created.append(o)
    ExpertLog.objects.create(action='load_sample', payload=json.dumps({'count': len(created)}))
    serializer = RankedObjectSerializer(created, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def save_ranking(request):
    # expects JSON: {order: [objId1, objId2, ...]} first element = highest rank
    data = request.data
    order = data.get('order', [])
    if not order:
        return Response({'error': 'order missing'}, status=400)
    # log the action
    ExpertLog.objects.create(action='save_ranking', payload=json.dumps({'order': order}))
    # compute pairwise matrix from ranking
    n = len(order)
    pairs = []
    # create b_ij: if i ranks higher than j -> 1, else -1; store pairs for upper triangle
    for i in range(n):
        for j in range(i+1, n):
            id_i = order[i]
            id_j = order[j]
            pairs.append([int(id_i), int(id_j), 1])
    matrix = {'n': n, 'order': order, 'pairs': pairs}
    pm = PairwiseMatrix.objects.create(matrix_json=json.dumps(matrix))
    serializer = PairwiseMatrixSerializer(pm)
    return Response(serializer.data)


@api_view(['GET'])
def logs_list(request):
    logs = ExpertLog.objects.all().order_by('-timestamp')[:200]
    serializer = ExpertLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def latest_matrix(request):
    pm = PairwiseMatrix.objects.all().order_by('-created_at').first()
    if not pm:
        return Response({'error': 'no matrix yet'}, status=404)
    serializer = PairwiseMatrixSerializer(pm)
    return Response(serializer.data)