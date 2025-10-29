from django.http import JsonResponse

def healthcheck(request):
    return JsonResponse({
        "status": "HEALTHY",
        "service": "Denn API",
        "version": "1.0.0"
    })
