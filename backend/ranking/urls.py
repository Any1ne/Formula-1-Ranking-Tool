from django.urls import path
from . import views

urlpatterns = [
    # Об'єкти
    path('objects/', views.objects_list_create, name='objects-list-create'),
    path('objects/upload_csv/', views.upload_csv, name='upload-csv'),
    path('objects/sample/', views.load_sample_objects, name='load-sample'),
    path('objects/clear/', views.clear_objects, name='clear-objects'),
    
    # Ранжування
    path('ranking/save/', views.save_ranking, name='save-ranking'),
    
    # Матриця
    path('matrix/latest/', views.latest_matrix, name='latest-matrix'),
    
    # Логи
    path('logs/', views.logs_list, name='logs-list'),
]