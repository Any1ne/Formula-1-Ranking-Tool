from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import RankedObject, ExpertLog, PairwiseMatrix
from .serializers import RankedObjectSerializer, ExpertLogSerializer, PairwiseMatrixSerializer
import csv
import io
import json


@api_view(['GET', 'POST'])
def objects_list_create(request):
    """GET: список об'єктів, POST: створити об'єкт"""
    if request.method == 'GET':
        objs = RankedObject.objects.all()
        serializer = RankedObjectSerializer(objs, many=True)
        return Response(serializer.data)
    
    else:  # POST
        serializer = RankedObjectSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            # Логування
            ExpertLog.objects.create(
                action='create_object',
                payload=json.dumps(serializer.data)
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def upload_csv(request):
    """Завантаження об'єктів з CSV файлу"""
    f = request.FILES.get('file')
    if not f:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        data = f.read().decode('utf-8')
        reader = csv.reader(io.StringIO(data))
        created = []
        
        for row in reader:
            if not row:
                continue
            name = row[0].strip()
            if name and name.lower() != 'name' and name.lower() != 'constructor':
                obj = RankedObject.objects.create(name=name)
                created.append(obj)
        
        # Логування
        ExpertLog.objects.create(
            action='upload_csv',
            payload=json.dumps({
                'filename': f.name,
                'created_count': len(created),
                'created_ids': [o.id for o in created]
            })
        )
        
        serializer = RankedObjectSerializer(created, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def load_sample_objects(request):
    """Завантаження прикладу (12 команд F1)"""
    sample = [
        'Mercedes', 'Red Bull', 'Ferrari', 'McLaren', 'Alpine', 'Aston Martin',
        'AlphaTauri', 'Williams', 'Haas', 'Alfa Romeo', 'Sauber', 'Toro Rosso'
    ]
    
    created = []
    for name in sample:
        obj, was_created = RankedObject.objects.get_or_create(name=name)
        created.append(obj)
    
    # Логування
    ExpertLog.objects.create(
        action='load_sample',
        payload=json.dumps({'count': len(created)})
    )
    
    serializer = RankedObjectSerializer(created, many=True)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def save_ranking(request):
    """Збереження ранжування та генерація матриці попарних порівнянь"""
    data = request.data
    order = data.get('order', [])
    
    if not order:
        return Response({'error': 'Order is missing'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Логування
    ExpertLog.objects.create(
        action='save_ranking',
        payload=json.dumps({'order': order, 'count': len(order)})
    )
    
    # Обчислення матриці попарних порівнянь
    n = len(order)
    pairs = []
    
    # Для кожної пари (i, j) де i < j:
    # Якщо об'єкт order[i] має вищий ранг (менший індекс) ніж order[j], то значення = 1
    for i in range(n):
        for j in range(i + 1, n):
            id_i = order[i]
            id_j = order[j]
            # i має вищий ранг (менший індекс), тому i > j → 1
            pairs.append([int(id_i), int(id_j), 1])
    
    matrix = {
        'n': n,
        'order': order,
        'pairs': pairs
    }
    
    # Зберігаємо матрицю
    pm = PairwiseMatrix.objects.create(matrix_json=json.dumps(matrix))
    serializer = PairwiseMatrixSerializer(pm)
    
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def logs_list(request):
    """Отримання протоколу дій експерта"""
    limit = request.query_params.get('limit', 200)
    logs = ExpertLog.objects.all()[:int(limit)]
    serializer = ExpertLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def latest_matrix(request):
    """Отримання останньої матриці попарних порівнянь"""
    pm = PairwiseMatrix.objects.first()
    
    if not pm:
        return Response(
            {'error': 'No matrix found. Save a ranking first.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = PairwiseMatrixSerializer(pm)
    return Response(serializer.data)


@api_view(['DELETE'])
def clear_objects(request):
    """Видалення всіх об'єктів (для тестування)"""
    count = RankedObject.objects.count()
    RankedObject.objects.all().delete()
    
    ExpertLog.objects.create(
        action='clear_objects',
        payload=json.dumps({'deleted_count': count})
    )
    
    return Response({'deleted': count}, status=status.HTTP_200_OK)