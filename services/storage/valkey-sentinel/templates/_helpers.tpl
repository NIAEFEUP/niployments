{{- define "valkey-sentinel.name" -}}
valkey
{{- end -}}

{{- define "valkey-sentinel.sentinelName" -}}
valkey-sentinel
{{- end -}}

{{- define "valkey-sentinel.namespace" -}}
{{- if .Values.namespace.create -}}
{{ .Values.namespace.name }}
{{- else -}}
{{ .Release.Namespace }}
{{- end -}}
{{- end -}}
