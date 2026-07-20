window.angular
  .module('echartsConcept', [])
  .model('chartModel', () => ({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    values: [12, 18, 9, 24, 16, 21],
    selectedIndex: 0,
    color: '#2f80ed',
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['chartModel', '$scope'];

      constructor(chartModel, $scope) {
        this.chart = chartModel;
        this.destroyRuntime = () => {};
        $scope.$on('$destroy', () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      randomize() {
        this.chart.values = this.chart.values.map(() =>
          Math.round(8 + Math.random() * 24),
        );
      }

      selectNext() {
        this.chart.selectedIndex =
          (Number(this.chart.selectedIndex) + 1) % this.chart.labels.length;
      }

      mount() {
        const host = document.getElementById('chart-view');
        const chart = echarts.init(host);
        let signature = '';
        let frame = 0;

        chart.on('click', (event) => {
          if (Number.isInteger(event.dataIndex)) {
            this.chart.selectedIndex = event.dataIndex;
          }
        });

        const render = () => {
          const nextSignature = JSON.stringify({
            labels: this.chart.labels,
            values: this.chart.values,
            selectedIndex: this.chart.selectedIndex,
            color: this.chart.color,
          });

          if (nextSignature !== signature) {
            signature = nextSignature;
            chart.setOption({
              animation: false,
              color: [this.chart.color],
              grid: {
                left: 42,
                right: 20,
                top: 24,
                bottom: 36,
              },
              xAxis: {
                type: 'category',
                data: this.chart.labels,
              },
              yAxis: {
                type: 'value',
              },
              series: [
                {
                  type: 'bar',
                  data: this.chart.values.map((value, index) => ({
                    value,
                    itemStyle: {
                      opacity: index === this.chart.selectedIndex ? 1 : 0.48,
                    },
                  })),
                },
              ],
            });
          }

          frame = requestAnimationFrame(render);
        };

        window.addEventListener('resize', chart.resize);
        render();

        this.destroyRuntime = () => {
          cancelAnimationFrame(frame);
          window.removeEventListener('resize', chart.resize);
          chart.dispose();
        };
      }
    },
  );
