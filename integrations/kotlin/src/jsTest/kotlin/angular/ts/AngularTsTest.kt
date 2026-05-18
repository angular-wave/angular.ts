package angular.ts

import kotlin.test.Test
import kotlin.test.assertEquals

class AngularTsTest {
    @Test
    fun exposesPackageMarker() {
        assertEquals("angular.ts", ng.marker())
    }

    @Test
    fun createsTypedTokens() {
        val token = ng.token<String>("message")

        assertEquals("message", token.name)
    }

    @Test
    fun tracksInjectionTokens() {
        val first = ng.token<String>("first")
        val second = ng.token<Int>("second")
        val injectable = ng.inject2(first, second) { value, count ->
            value.repeat(count)
        }

        assertEquals(listOf(first, second), injectable.tokens)
        assertEquals("aaa", injectable.factory("a", 3))
    }
}
