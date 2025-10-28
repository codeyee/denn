def healthcheck(request):
    return JsonResponse({
        "status": "HEALTHY"
    })
