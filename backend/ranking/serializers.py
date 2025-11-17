from rest_framework import serializers
from .models import RankedObject, ExpertLog, PairwiseMatrix


class RankedObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = RankedObject
        fields = ['id', 'name', 'details', 'created_at']


class ExpertLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertLog
        fields = ['id', 'action', 'payload', 'timestamp']


class PairwiseMatrixSerializer(serializers.ModelSerializer):
    class Meta:
        model = PairwiseMatrix
        fields = ['id', 'matrix_json', 'created_at']