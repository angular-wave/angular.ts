import angular.ts.Component
import angular.ts.Directive
import angular.ts.DirectiveRestrict
import angular.ts.bootstrap
import angular.ts.module
import angular.ts.ng
import org.w3c.dom.Element

private external interface GreetingService {
    fun message(name: String): String
}

private val greetingToken = ng.token<GreetingService>("kotlinGreeting")

fun main() {
    val app = ng.module("kotlinBasicApp")
        .factory(
            greetingToken,
            ng.inject0 {
                js(
                    "({message:function(name){return 'Hello, ' + name + ' from Kotlin'}})",
                ).unsafeCast<GreetingService>()
            },
        )
        .filter("kotlinShout") {
            { input: Any? -> input.toString().uppercase() }
        }
        .directive(
            "kotlinReady",
            Directive<Unit>(
                restrict = DirectiveRestrict.Attribute,
                postLink = { _, element, _, _ ->
                    element.setAttribute("data-kotlin-ready", "true")
                },
            ),
        )
        .component(
            "kotlinGreeting",
            Component<Any>(
                controllerAs = "ctrl",
                controller = ng.inject1(greetingToken) { greeting ->
                    val controller = js("({name:'Kotlin',visible:false,toggle:function(){this.visible = !this.visible}})")
                    controller.message = greeting.message("Kotlin")
                    controller.unsafeCast<Any>()
                },
                template = """
                    <section class="kotlin-card" kotlin-ready>
                      <p class="service-message">{{ ctrl.message | kotlinShout }}</p>
                      <button type="button" ng-click="ctrl.toggle()">Toggle detail</button>
                      <p class="detail" ng-if="ctrl.visible">Directive linked</p>
                    </section>
                """.trimIndent(),
            ),
        )

    val host = js("document.getElementById('kotlin-basic-app') || document.body")

    ng.bootstrap(host.unsafeCast<Element>(), listOf(app.name))
}
