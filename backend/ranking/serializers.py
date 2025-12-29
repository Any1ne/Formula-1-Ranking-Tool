from rest_framework import serializers
from .models import RankedObject, ExpertLog, PairwiseMatrix, Expert


class ExpertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expert
        fields = "__all__"


class RankedObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = RankedObject
        fields = "__all__"


class ExpertLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpertLog
        fields = "__all__"


class PairwiseMatrixSerializer(serializers.ModelSerializer):
    # Додаємо поле, щоб фронтенд отримував ім'я експерта автоматично
    expert_name = serializers.CharField(source="expert.name", read_only=True)

    class Meta:
        model = PairwiseMatrix
        fields = ["id", "expert", "expert_name", "created_at", "matrix_json"]
