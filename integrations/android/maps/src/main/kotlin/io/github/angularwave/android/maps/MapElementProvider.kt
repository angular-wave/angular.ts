package io.github.angularwave.android.maps

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import androidx.core.content.ContextCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.MapView
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import io.github.angularwave.android.navigation.elements.NativeElementCatalog
import io.github.angularwave.android.navigation.elements.NativeElementContext
import io.github.angularwave.android.navigation.elements.NativeElementDefinition
import io.github.angularwave.android.navigation.elements.NativeElementFactory
import io.github.angularwave.android.navigation.elements.NativeElementInstance
import io.github.angularwave.android.navigation.elements.NativeElementProvider
import io.github.angularwave.android.navigation.elements.NativeProperties
import io.github.angularwave.android.navigation.elements.RegisterNativeElementProvider
import org.json.JSONObject

@RegisterNativeElementProvider("map")
class MapElementProvider : NativeElementProvider {
    override fun definitions(): Collection<NativeElementDefinition> =
        listOf(NativeElementCatalog.map(NativeElementFactory(::MapElement)))
}

internal class MapElement(
    private val elementContext: NativeElementContext,
    initialProperties: NativeProperties,
) : NativeElementInstance, DefaultLifecycleObserver {
    private val mapView = MapView(elementContext.context)
    private var map: GoogleMap? = null
    private var properties = initialProperties
    private var restoredCamera: CameraState? = null
    private var markerLocations = emptyList<LatLng>()
    private var destroyed = false

    override val view: View = mapView

    init {
        mapView.onCreate(null)
        elementContext.lifecycleOwner.lifecycle.addObserver(this)
        mapView.getMapAsync { readyMap ->
            if (destroyed) return@getMapAsync
            map = readyMap
            configureListeners(readyMap)
            applyProperties(readyMap)
            restoredCamera?.let { moveCamera(readyMap, it.latitude, it.longitude, it.zoom, false) }
            elementContext.events.emit(NativeElementCatalog.Wire.READY, status(readyMap))
        }
        update(initialProperties)
    }

    override fun update(properties: NativeProperties) {
        this.properties = properties
        mapView.contentDescription =
            properties.string(NativeElementCatalog.Wire.CONTENT_DESCRIPTION, "Map")
        map?.let(::applyProperties)
    }

    override fun invoke(method: String, parameters: NativeProperties): Any? {
        val readyMap = map ?: return JSONObject().put("ready", false)
        when (method) {
            NativeElementCatalog.Wire.MOVE -> moveCamera(readyMap, parameters, false)
            NativeElementCatalog.Wire.ANIMATE -> moveCamera(readyMap, parameters, true)
            NativeElementCatalog.Wire.FIT_MARKERS -> fitMarkers(readyMap)
            else -> return super.invoke(method, parameters)
        }
        return status(readyMap)
    }

    override fun saveState(): Bundle =
        Bundle().apply {
            map?.cameraPosition?.let { camera ->
                putDouble(STATE_LATITUDE, camera.target.latitude)
                putDouble(STATE_LONGITUDE, camera.target.longitude)
                putFloat(STATE_ZOOM, camera.zoom)
            }
        }

    override fun restoreState(state: Bundle) {
        if (!state.containsKey(STATE_LATITUDE)) return
        restoredCamera =
            CameraState(
                state.getDouble(STATE_LATITUDE),
                state.getDouble(STATE_LONGITUDE),
                state.getFloat(
                    STATE_ZOOM,
                    properties.float(NativeElementCatalog.Wire.ZOOM, DEFAULT_ZOOM),
                ),
            )
        map?.let { readyMap ->
            restoredCamera?.let { moveCamera(readyMap, it.latitude, it.longitude, it.zoom, false) }
        }
    }

    override fun onStart(owner: LifecycleOwner) = mapView.onStart()

    override fun onResume(owner: LifecycleOwner) = mapView.onResume()

    override fun onPause(owner: LifecycleOwner) = mapView.onPause()

    override fun onStop(owner: LifecycleOwner) = mapView.onStop()

    override fun onDestroy(owner: LifecycleOwner) = dispose()

    override fun dispose() {
        if (destroyed) return
        destroyed = true
        elementContext.lifecycleOwner.lifecycle.removeObserver(this)
        mapView.onDestroy()
        map = null
    }

    @SuppressLint("MissingPermission")
    private fun applyProperties(readyMap: GoogleMap) {
        readyMap.mapType =
            when (properties.string(NativeElementCatalog.Wire.MAP_TYPE, "normal")) {
                "hybrid" -> GoogleMap.MAP_TYPE_HYBRID
                "satellite" -> GoogleMap.MAP_TYPE_SATELLITE
                "terrain" -> GoogleMap.MAP_TYPE_TERRAIN
                "none" -> GoogleMap.MAP_TYPE_NONE
                else -> GoogleMap.MAP_TYPE_NORMAL
            }
        readyMap.isTrafficEnabled = properties.boolean(NativeElementCatalog.Wire.TRAFFIC)
        val showLocation =
            properties.boolean(NativeElementCatalog.Wire.USER_LOCATION) && hasLocationPermission()
        try {
            readyMap.isMyLocationEnabled = showLocation
        } catch (_: SecurityException) {
            readyMap.isMyLocationEnabled = false
        }
        readyMap.clear()
        markerLocations =
            properties.objects(NativeElementCatalog.Wire.MARKERS).mapNotNull { marker ->
                if (!marker.has("latitude") || !marker.has("longitude")) return@mapNotNull null
                val location = LatLng(marker.getDouble("latitude"), marker.getDouble("longitude"))
                readyMap
                    .addMarker(
                        MarkerOptions()
                            .position(location)
                            .title(marker.optString("title").ifBlank { null })
                            .snippet(marker.optString("snippet").ifBlank { null })
                    )
                    ?.tag = marker.optString("id").ifBlank { null }
                location
            }
        moveCamera(
            readyMap,
            properties.float(NativeElementCatalog.Wire.LATITUDE).toDouble(),
            properties.float(NativeElementCatalog.Wire.LONGITUDE).toDouble(),
            properties.float(NativeElementCatalog.Wire.ZOOM, DEFAULT_ZOOM),
            false,
        )
    }

    private fun configureListeners(readyMap: GoogleMap) {
        readyMap.setOnCameraIdleListener {
            elementContext.events.emit(NativeElementCatalog.Wire.CAMERA_CHANGE, status(readyMap))
        }
        readyMap.setOnMapClickListener { location ->
            elementContext.events.emit(NativeElementCatalog.Wire.MAP_CLICK, locationJson(location))
        }
        readyMap.setOnMarkerClickListener { marker ->
            elementContext.events.emit(
                NativeElementCatalog.Wire.MARKER_CLICK,
                locationJson(marker.position).put("id", marker.tag ?: JSONObject.NULL),
            )
            false
        }
    }

    private fun moveCamera(readyMap: GoogleMap, parameters: NativeProperties, animate: Boolean) {
        moveCamera(
            readyMap,
            parameters.float(NativeElementCatalog.Wire.LATITUDE).toDouble(),
            parameters.float(NativeElementCatalog.Wire.LONGITUDE).toDouble(),
            parameters.float(NativeElementCatalog.Wire.ZOOM, readyMap.cameraPosition.zoom),
            animate,
        )
    }

    private fun moveCamera(
        readyMap: GoogleMap,
        latitude: Double,
        longitude: Double,
        zoom: Float,
        animate: Boolean,
    ) {
        val update = CameraUpdateFactory.newLatLngZoom(LatLng(latitude, longitude), zoom)
        if (animate) readyMap.animateCamera(update) else readyMap.moveCamera(update)
    }

    private fun fitMarkers(readyMap: GoogleMap) {
        if (markerLocations.isEmpty()) return
        if (markerLocations.size == 1) {
            readyMap.animateCamera(CameraUpdateFactory.newLatLng(markerLocations.single()))
            return
        }
        val bounds =
            LatLngBounds.builder()
                .also { builder -> markerLocations.forEach(builder::include) }
                .build()
        readyMap.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, BOUNDS_PADDING_PX))
    }

    private fun status(readyMap: GoogleMap): JSONObject =
        locationJson(readyMap.cameraPosition.target)
            .put("ready", true)
            .put("zoom", readyMap.cameraPosition.zoom.toDouble())

    private fun locationJson(location: LatLng): JSONObject =
        JSONObject().put("latitude", location.latitude).put("longitude", location.longitude)

    private fun hasLocationPermission(): Boolean =
        listOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            )
            .any {
                ContextCompat.checkSelfPermission(elementContext.context, it) ==
                    PackageManager.PERMISSION_GRANTED
            }

    private data class CameraState(val latitude: Double, val longitude: Double, val zoom: Float)

    private companion object {
        const val STATE_LATITUDE = "latitude"
        const val STATE_LONGITUDE = "longitude"
        const val STATE_ZOOM = "zoom"
        const val DEFAULT_ZOOM = 12f
        const val BOUNDS_PADDING_PX = 48
    }
}
