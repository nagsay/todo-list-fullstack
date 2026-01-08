from django.db import models

class Task(models.Model):
    CATEGORY_CHOICES = [
        ('Pessoal', 'Pessoal'),
        ('Trabalho', 'Trabalho'),
        ('Estudos', 'Estudos'),
    ]

    text = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='Pessoal')
    date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text