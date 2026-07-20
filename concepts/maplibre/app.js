window.angular
  .module('mapLibreConcept', [])
  .model('mapModel', () => ({
    center: {
      lng: -0.1276,
      lat: 51.5072,
    },
    zoom: 9,
    marker: {
      lng: -0.1276,
      lat: 51.5072,
    },
    markerColor: '#2f80ed',
  }))
  .controller(
    'DemoCtrl',
    class {
      static $inject = ['mapModel', '$scope'];

      constructor(mapModel, $scope) {
        this.map = mapModel;
        this.destroyRuntime = () => {};
        $scope.$on('$destroy', () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      flyToLondon() {
        this.setCamera(-0.1276, 51.5072, 9);
      }

      flyToNewYork() {
        this.setCamera(-74.006, 40.7128, 10);
      }

      zoomIn() {
        this.map.zoom = Math.min(16, Number(this.map.zoom) + 1);
      }

      zoomOut() {
        this.map.zoom = Math.max(1, Number(this.map.zoom) - 1);
      }

      setCamera(lng, lat, zoom) {
        this.map.center.lng = lng;
        this.map.center.lat = lat;
        this.map.marker.lng = lng;
        this.map.marker.lat = lat;
        this.map.zoom = zoom;
      }

      mount() {
        const map = new maplibregl.Map({
          container: 'map-view',
          center: [this.map.center.lng, this.map.center.lat],
          zoom: this.map.zoom,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: 'OpenStreetMap contributors',
              },
            },
            layers: [
              {
                id: 'osm',
                type: 'raster',
                source: 'osm',
              },
            ],
          },
        });
        const markerElement = document.createElement('div');
        const marker = new maplibregl.Marker({
          element: markerElement,
          draggable: true,
        })
          .setLngLat([this.map.marker.lng, this.map.marker.lat])
          .addTo(map);
        let frame = 0;
        let syncingFromMap = false;

        markerElement.style.width = '22px';
        markerElement.style.height = '22px';
        markerElement.style.border = '2px solid white';
        markerElement.style.borderRadius = '999px';
        markerElement.style.boxShadow = '0 1px 6px rgba(0, 0, 0, 0.4)';

        map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

        map.on('moveend', () => {
          const center = map.getCenter();

          syncingFromMap = true;
          this.map.center.lng = center.lng;
          this.map.center.lat = center.lat;
          this.map.zoom = map.getZoom();
          syncingFromMap = false;
        });

        map.on('click', (event) => {
          this.map.marker.lng = event.lngLat.lng;
          this.map.marker.lat = event.lngLat.lat;
        });

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();

          this.map.marker.lng = lngLat.lng;
          this.map.marker.lat = lngLat.lat;
        });

        const render = () => {
          markerElement.style.background = this.map.markerColor;
          marker.setLngLat([this.map.marker.lng, this.map.marker.lat]);

          if (!syncingFromMap) {
            const current = map.getCenter();
            const nextLng = Number(this.map.center.lng);
            const nextLat = Number(this.map.center.lat);
            const nextZoom = Number(this.map.zoom);

            if (
              Math.abs(current.lng - nextLng) > 0.0001 ||
              Math.abs(current.lat - nextLat) > 0.0001 ||
              Math.abs(map.getZoom() - nextZoom) > 0.01
            ) {
              map.jumpTo({
                center: [nextLng, nextLat],
                zoom: nextZoom,
              });
            }
          }

          frame = requestAnimationFrame(render);
        };

        render();

        this.destroyRuntime = () => {
          cancelAnimationFrame(frame);
          marker.remove();
          map.remove();
        };
      }
    },
  );
