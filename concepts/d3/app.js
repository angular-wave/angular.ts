window.angular
  .module('d3Concept', [])
  .model('chartModel', () => ({
    labels: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'],
    values: [18, 28, 14, 34, 22],
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
          Math.round(8 + Math.random() * 34),
        );
      }

      selectNext() {
        this.chart.selectedIndex =
          (Number(this.chart.selectedIndex) + 1) % this.chart.labels.length;
      }

      mount() {
        const svg = d3.select('#d3-view');
        const width = 640;
        const height = 300;
        const margin = { top: 20, right: 20, bottom: 38, left: 40 };
        let signature = '';
        let frame = 0;

        const render = () => {
          const nextSignature = JSON.stringify(this.chart);

          if (signature !== nextSignature) {
            signature = nextSignature;
            const data = this.chart.labels.map((label, index) => ({
              label,
              value: Number(this.chart.values[index]),
              index,
            }));
            const x = d3
              .scaleBand()
              .domain(data.map((item) => item.label))
              .range([margin.left, width - margin.right])
              .padding(0.18);
            const y = d3
              .scaleLinear()
              .domain([0, d3.max(data, (item) => item.value) || 1])
              .nice()
              .range([height - margin.bottom, margin.top]);

            svg.selectAll('*').remove();
            svg
              .append('g')
              .attr('transform', `translate(0,${height - margin.bottom})`)
              .call(d3.axisBottom(x));
            svg
              .append('g')
              .attr('transform', `translate(${margin.left},0)`)
              .call(d3.axisLeft(y));
            svg
              .append('g')
              .selectAll('rect')
              .data(data)
              .join('rect')
              .attr('x', (item) => x(item.label))
              .attr('y', (item) => y(item.value))
              .attr('width', x.bandwidth())
              .attr('height', (item) => y(0) - y(item.value))
              .attr('fill', this.chart.color)
              .attr('opacity', (item) =>
                item.index === this.chart.selectedIndex ? 1 : 0.45,
              )
              .style('cursor', 'pointer')
              .on('click', (_, item) => {
                this.chart.selectedIndex = item.index;
              });
          }

          frame = requestAnimationFrame(render);
        };

        render();

        this.destroyRuntime = () => {
          cancelAnimationFrame(frame);
          svg.selectAll('*').remove();
        };
      }
    },
  );
