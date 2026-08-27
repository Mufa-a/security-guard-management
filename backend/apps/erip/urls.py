from django.urls import path
from . import views

urlpatterns = [
    path("chat/", views.ErpChatView.as_view(), name="erip-chat"),
    path("conversations/<uuid:pk>/", views.ErpConversationDetailView.as_view(), name="erip-conversation-detail"),
]
