import angular.ts.AppComponent
import angular.ts.WebComponentEvent
import angular.ts.bootstrap
import angular.ts.inputBoolean
import angular.ts.inputString
import angular.ts.module
import angular.ts.ng
import org.w3c.dom.Element

private external interface CounterState {
    var count: Int
    var label: String
    fun increment()
}

private external interface StatusState {
    var active: Boolean
    var label: String
    fun toggle()
}

fun main() {
    val module = ng.module("kotlinWebComponents")
        .appComponent(
            "kt-counter-card",
            AppComponent<CounterState>(
                template = """
                    <button type="button" ng-click="increment()">
                      {{ label }}: {{ count }}
                    </button>
                """.trimIndent(),
                shadow = true,
                scope = {
                    js(
                        "({count:0,label:'Counter',increment:function(){this.count = this.count + 1}})",
                    ).unsafeCast<CounterState>()
                },
                inputs = mapOf(
                    "label" to inputString(attribute = "label", defaultValue = "Counter", reflect = true),
                ),
                connected = { context ->
                    context.dispatch(
                        WebComponentEvent(
                            name = "kotlin-ready",
                            detail = "counter",
                            init = mapOf("bubbles" to true, "composed" to true),
                        ),
                    )
                    null
                },
            ),
        )
        .appComponent(
            "kt-status-badge",
            AppComponent<StatusState>(
                template = """
                    <button type="button" ng-click="toggle()">
                      {{ label }}: {{ active ? "active" : "idle" }}
                    </button>
                """.trimIndent(),
                shadow = true,
                scope = {
                    js(
                        "({active:true,label:'Status',toggle:function(){this.active = !this.active}})",
                    ).unsafeCast<StatusState>()
                },
                inputs = mapOf(
                    "active" to inputBoolean(attribute = "active", defaultValue = true, reflect = true),
                    "label" to inputString(attribute = "label", defaultValue = "Status", reflect = true),
                ),
                connected = { context ->
                    context.dispatch(
                        WebComponentEvent(
                            name = "kotlin-ready",
                            detail = "status",
                            init = mapOf("bubbles" to true, "composed" to true),
                        ),
                    )
                    null
                },
            ),
        )

    val host = js("document.getElementById('kotlin-web-components') || document.body")
    host.innerHTML = """
        <kt-counter-card label="Orders"></kt-counter-card>
        <kt-status-badge label="Inventory"></kt-status-badge>
    """.trimIndent()

    ng.bootstrap(host.unsafeCast<Element>(), listOf(module.name))
}
