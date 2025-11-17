from django.db import models
import json


class RankedObject(models.Model):
    # objects to be ranked (Formula 1 teams in our domain)
    name = models.CharField(max_length=200)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return self.name


class ExpertLog(models.Model):
    # log of expert actions (reordering, uploads)
    action = models.CharField(max_length=200)
    payload = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"{self.timestamp} - {self.action}"


class PairwiseMatrix(models.Model):
    # store full pairwise matrix as JSON (upper triangle represented as list)
    created_at = models.DateTimeField(auto_now_add=True)
    matrix_json = models.TextField() # JSON: {'n':..., 'pairs': [[i,j,value],...]}


    def as_dict(self):
        return json.loads(self.matrix_json)


    def __str__(self):
        return f"PairwiseMatrix {self.id} ({self.created_at})"