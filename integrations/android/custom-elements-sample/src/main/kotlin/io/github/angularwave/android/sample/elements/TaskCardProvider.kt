package io.github.angularwave.android.sample.elements

import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.compose.foundation.clickable
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import io.github.angularwave.android.navigation.elements.NativeElementAccessibility
import io.github.angularwave.android.navigation.elements.NativeElementCategory
import io.github.angularwave.android.navigation.elements.NativeElementDefinition
import io.github.angularwave.android.navigation.elements.NativeElementFactory
import io.github.angularwave.android.navigation.elements.NativeElementInstance
import io.github.angularwave.android.navigation.elements.NativeElementMaturity
import io.github.angularwave.android.navigation.elements.NativeElementProvider
import io.github.angularwave.android.navigation.elements.NativeProperties
import io.github.angularwave.android.navigation.elements.NativePropertyDefinition
import io.github.angularwave.android.navigation.elements.NativePropertyType
import io.github.angularwave.android.navigation.elements.RegisterNativeElementProvider
import io.github.angularwave.android.navigation.elements.composeNativeElement

@RegisterNativeElementProvider("task-card", "task-status")
class TaskCardProvider : NativeElementProvider {
    override fun definitions() =
        listOf(
            NativeElementDefinition(
                name = "task-card",
                properties =
                    listOf(
                        NativePropertyDefinition(
                            "title",
                            NativePropertyType.STRING,
                            required = true,
                        ),
                        NativePropertyDefinition(
                            "complete",
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                    ),
                events = setOf("click"),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.STABLE,
                stateOwnership =
                    io.github.angularwave.android.navigation.elements.NativeElementStateOwnership
                        .NONE,
                accessibility = NativeElementAccessibility("button", "title"),
                factory =
                    NativeElementFactory { context, properties ->
                        val title = TextView(context.context)
                        val card =
                            LinearLayout(context.context).apply {
                                isClickable = true
                                isFocusable = true
                                addView(title)
                                setOnClickListener { context.events.emit("click", null) }
                            }
                        object : NativeElementInstance {
                                override val view: View = card

                                override fun update(properties: NativeProperties) {
                                    val complete = properties.boolean("complete")
                                    title.text = properties.string("title")
                                    title.paint.isStrikeThruText = complete
                                    card.contentDescription = title.text
                                    card.isSelected = complete
                                }
                            }
                            .also { it.update(properties) }
                    },
            ),
            NativeElementDefinition(
                name = "task-status",
                properties =
                    listOf(
                        NativePropertyDefinition("text", NativePropertyType.STRING, required = true)
                    ),
                events = setOf("click"),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.STABLE,
                accessibility = NativeElementAccessibility("button", "text"),
                factory =
                    composeNativeElement { properties ->
                        Card(modifier = Modifier.clickable { emit("click") }) {
                            Text(properties.string("text"))
                        }
                    },
            ),
        )
}
