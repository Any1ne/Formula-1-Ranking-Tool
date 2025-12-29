from django.urls import path
from . import views

urlpatterns = [
    path("experts/", views.experts_list_create),
    path("objects/", views.objects_list_create),
    path("upload-csv/", views.upload_csv),
    path("load-samples/", views.load_sample_objects),
    path("objects/clear/", views.clear_objects),
    path("save-ranking/", views.save_ranking),
    path("logs/", views.logs_list),
    path("latest-matrix/", views.latest_matrix),
    path("collective-csv/", views.collective_matrix_csv),
    path("experts/<int:expert_id>/ranking/", views.get_expert_ranking),
    # New Lab 3 Endpoint
    path("calculate-consensus/", views.calculate_consensus),
    # Lab 6
    path("shower-inference/", views.run_shower_inference),
]
