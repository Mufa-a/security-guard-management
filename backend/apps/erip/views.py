from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework import status
import logging

from .models import ErpConversation, ErpMessage
from .serializers import ErpChatRequestSerializer, ErpConversationSerializer
from .permissions import HasErpAccess, ErpChatRateThrottle
from . import service

logger = logging.getLogger("erip")

MAX_HISTORY_MESSAGES = 20


class ErpChatView(APIView):
    permission_classes = [HasErpAccess]
    throttle_classes = [ErpChatRateThrottle]

    def post(self, request):
        serializer = ErpChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message_text = serializer.validated_data["message"]
        conversation_id = serializer.validated_data.get("conversation_id")

        if conversation_id:
            conversation = ErpConversation.objects.filter(
                id=conversation_id, user=request.user
            ).first()
            if conversation is None:
                # Fail closed: don't leak whether a conversation ID exists
                # for someone else by returning a different error shape.
                return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            conversation = ErpConversation.objects.create(
                user=request.user, title=message_text[:60]
            )

        history_qs = conversation.messages.order_by("-created_at")[:MAX_HISTORY_MESSAGES]
        history = [
            {"role": "user" if m.role == ErpMessage.Role.USER else "assistant", "content": m.content}
            for m in reversed(list(history_qs))
        ]

        ErpMessage.objects.create(conversation=conversation, role=ErpMessage.Role.USER, content=message_text)

        try:
            reply_text = service.handle_message(request.user, conversation, history, message_text)
        except Exception:
            logger.exception("Erip chat request failed")
            return Response(
                {"detail": "Erip is temporarily unavailable. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        ErpMessage.objects.create(conversation=conversation, role=ErpMessage.Role.ASSISTANT, content=reply_text)

        return Response({"conversation_id": str(conversation.id), "reply": reply_text})


class ErpConversationDetailView(RetrieveAPIView):
    permission_classes = [HasErpAccess]
    serializer_class = ErpConversationSerializer

    def get_queryset(self):
        # Scoped to the requesting user only — Erip conversations are never
        # visible across users, regardless of role.
        return ErpConversation.objects.filter(user=self.request.user)