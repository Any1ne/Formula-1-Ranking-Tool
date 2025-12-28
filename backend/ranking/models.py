from django.db import models
import json


class RankedObject(models.Model):
    """Об'єкти для ранжування (команди Formula 1)"""
    name = models.CharField(max_length=200)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']

class ExpertLog(models.Model):
    """Протокол дій експерта"""
    action = models.CharField(max_length=200)
    payload = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.timestamp} - {self.action}"

    class Meta:
        ordering = ['-timestamp']


class PairwiseMatrix(models.Model):
    """Матриця попарних порівнянь"""
    created_at = models.DateTimeField(auto_now_add=True)
    matrix_json = models.TextField()  # JSON: {'n':..., 'order':..., 'pairs': [[i,j,value],...]}

    def as_dict(self):
        return json.loads(self.matrix_json)

    def __str__(self):
        return f"PairwiseMatrix {self.id} ({self.created_at})"

    class Meta:
        ordering = ['-created_at']