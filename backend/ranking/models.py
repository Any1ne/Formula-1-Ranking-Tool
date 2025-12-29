from django.db import models
import json


class Expert(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class RankedObject(models.Model):
    name = models.CharField(max_length=200)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ExpertLog(models.Model):
    # 👇 Цього поля не вистачало
    expert = models.ForeignKey(Expert, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=200)
    payload = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.timestamp} - {self.action}"


class PairwiseMatrix(models.Model):
    expert = models.ForeignKey(Expert, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    matrix_json = models.TextField()

    def __str__(self):
        return f"Ranking by {self.expert.name} ({self.created_at})"
