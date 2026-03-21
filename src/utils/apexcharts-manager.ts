// ─── GESTOR DE GRÁFICAS CON APEXCHARTS ────────────────────────────────────
import ApexCharts from 'apexcharts'

export const chartManager = {
  charts: new Map<string, ApexCharts>(),

  // Crear gráfica de pastel (votos por partido)
  createPieChart(
    elementId: string,
    data: { sigla: string; total: number; color: string }[],
    title: string
  ) {
    // Destruir gráfica anterior si existe
    if (this.charts.has(elementId)) {
      this.charts.get(elementId)?.destroy()
    }

    const element = document.querySelector(`#${elementId}`)
    if (!element) return

    const options: ApexCharts.ApexOptions = {
      series: data.map((d) => d.total),
      labels: data.map((d) => d.sigla),
      chart: {
        type: 'pie',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        height: 350,
      },
      colors: data.map((d) => d.color),
      title: {
        text: title,
        align: 'center',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        },
      },
      legend: {
        position: 'bottom',
        fontSize: '12px',
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val) => `${val} votos`,
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`,
      },
    }

    const chart = new ApexCharts(element as HTMLElement, options)
    chart.render()
    this.charts.set(elementId, chart)
  },

  // Crear gráfica de barras (comparación de partidos)
  createBarChart(
    elementId: string,
    categories: string[],
    series: { name: string; data: number[]; color: string }[],
    title: string
  ) {
    if (this.charts.has(elementId)) {
      this.charts.get(elementId)?.destroy()
    }

    const element = document.querySelector(`#${elementId}`)
    if (!element) return

    const options: ApexCharts.ApexOptions = {
      series: series.map((s) => ({ name: s.name, data: s.data })),
      chart: {
        type: 'bar',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        height: 300,
        toolbar: {
          show: true,
        },
      },
      colors: series.map((s) => s.color),
      xaxis: {
        categories: categories,
        title: {
          text: 'Partidos',
        },
      },
      yaxis: {
        title: {
          text: 'Votos',
        },
      },
      title: {
        text: title,
        align: 'center',
      },
      legend: {
        position: 'top',
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val) => `${val} votos`,
        },
      },
    }

    const chart = new ApexCharts(element as HTMLElement, options)
    chart.render()
    this.charts.set(elementId, chart)
  },

  // Crear gráfica de línea (tendencia de transmisiones)
  createLineChart(
    elementId: string,
    dates: string[],
    data: { name: string; data: number[]; color: string }[],
    title: string
  ) {
    if (this.charts.has(elementId)) {
      this.charts.get(elementId)?.destroy()
    }

    const element = document.querySelector(`#${elementId}`)
    if (!element) return

    const options: ApexCharts.ApexOptions = {
      series: data.map((d) => ({ name: d.name, data: d.data })),
      chart: {
        type: 'line',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        height: 280,
        toolbar: {
          show: true,
        },
      },
      colors: data.map((d) => d.color),
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      xaxis: {
        categories: dates,
        title: {
          text: 'Fecha/Hora',
        },
      },
      yaxis: {
        title: {
          text: 'Transmisiones',
        },
      },
      title: {
        text: title,
        align: 'center',
      },
      legend: {
        position: 'top',
      },
      tooltip: {
        theme: 'light',
        shared: true,
      },
    }

    const chart = new ApexCharts(element as HTMLElement, options)
    chart.render()
    this.charts.set(elementId, chart)
  },

  // Destruir todas las gráficas
  destroyAll() {
    this.charts.forEach((chart) => chart.destroy())
    this.charts.clear()
  },
}
