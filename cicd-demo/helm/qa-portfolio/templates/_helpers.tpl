{{/*
Expand the name of the chart.
*/}}
{{- define "qa-portfolio.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "qa-portfolio.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "qa-portfolio.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "qa-portfolio.labels" -}}
helm.sh/chart: {{ include "qa-portfolio.chart" . }}
{{ include "qa-portfolio.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "qa-portfolio.selectorLabels" -}}
app.kubernetes.io/name: {{ include "qa-portfolio.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Results server labels
*/}}
{{- define "qa-portfolio.resultsServer.labels" -}}
{{ include "qa-portfolio.labels" . }}
app.kubernetes.io/component: results-server
{{- end }}

{{/*
Results server selector labels
*/}}
{{- define "qa-portfolio.resultsServer.selectorLabels" -}}
{{ include "qa-portfolio.selectorLabels" . }}
app.kubernetes.io/component: results-server
{{- end }}

{{/*
Cypress job labels
*/}}
{{- define "qa-portfolio.cypress.labels" -}}
{{ include "qa-portfolio.labels" . }}
app.kubernetes.io/component: cypress
test-type: e2e
{{- end }}

{{/*
Newman job labels
*/}}
{{- define "qa-portfolio.newman.labels" -}}
{{ include "qa-portfolio.labels" . }}
app.kubernetes.io/component: newman
test-type: api
{{- end }}
