from django.urls import path
from . import views


urlpatterns = [
path('objects/', views.objects_list_create),
path('objects/upload_csv/', views.upload_csv),
path('objects/sample/', views.load_sample_objects),
path('ranking/save/', views.save_ranking),
path('logs/', views.logs_list),
path('matrix/latest/', views.latest_matrix),
]