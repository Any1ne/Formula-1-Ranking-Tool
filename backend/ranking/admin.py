from django.contrib import admin
from .models import RankedObject, ExpertLog, PairwiseMatrix


@admin.register(RankedObject)
class RankedObjectAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'created_at']
    search_fields = ['name']
    ordering = ['-created_at']


@admin.register(ExpertLog)
class ExpertLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'action', 'timestamp']
    list_filter = ['action']
    ordering = ['-timestamp']


@admin.register(PairwiseMatrix)
class PairwiseMatrixAdmin(admin.ModelAdmin):
    list_display = ['id', 'created_at']
    ordering = ['-created_at']