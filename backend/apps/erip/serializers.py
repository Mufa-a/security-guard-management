from rest_framework import serializers
from .models import ErpConversation, ErpMessage


class ErpMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErpMessage
        fields = ["id", "role", "content", "created_at"]


class ErpConversationSerializer(serializers.ModelSerializer):
    messages = ErpMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ErpConversation
        fields = ["id", "title", "created_at", "messages"]


class ErpChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
