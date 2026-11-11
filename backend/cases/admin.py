from django.contrib import admin

from .models import Case, CaseItem


class CaseItemInline(admin.TabularInline):
    model = CaseItem
    extra = 0
    fields = ("kind", "ref_code", "camera", "start_ts", "decision", "note")


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "created_by", "updated_at")
    list_filter = ("status",)
    inlines = [CaseItemInline]
