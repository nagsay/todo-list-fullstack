from rest_framework import viewsets
from .models import Task
from .serializers import TaskSerializer

class TaskViewSet(viewsets.ModelViewSet):
    # Mostra as tarefas não concluídas primeiro, e depois as mais novas
    queryset = Task.objects.all().order_by('completed', '-created_at')
    serializer_class = TaskSerializer