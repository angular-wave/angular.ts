import 'dart:js_interop';

import 'token.dart';
import 'unsafe.dart' as unsafe;

/// A typed dependency-injected factory.
final class InjectableFactory<R> {
  const InjectableFactory._(this.tokens, this._toJsFunction);

  /// Dependency tokens required by this factory.
  final List<Token<Object?>> tokens;

  final JSFunction Function() _toJsFunction;

  /// The to annotated array.
  JSArray<JSAny?> toAnnotatedArray() {
    final values = <JSAny?>[
      for (final token in tokens) token.name.toJS,
      _toJsFunction(),
    ];

    return values.toJS;
  }
}

/// Creates an injectable factory with no dependencies.
InjectableFactory<R> inject0<R>(R Function() factory) {
  return InjectableFactory<R>._(
    const [],
    () => (() => unsafe.dartToJs(factory())).toJS,
  );
}

/// Creates a JS-returning injectable factory with no dependencies.
InjectableFactory<R> injectJs0<R extends JSAny?>(R Function() factory) {
  return InjectableFactory<R>._(const [], () => (() => factory()).toJS);
}

/// Creates an injectable factory with one typed dependency.
InjectableFactory<R> inject1<A, R>(
  Token<A> a,
  R Function(A a) factory,
) {
  return InjectableFactory<R>._(
    [a],
    () => ((JSAny? aValue) {
      return unsafe.dartToJs(factory(a.fromJs(aValue)));
    }).toJS,
  );
}

/// Creates a JS-returning injectable factory with one typed dependency.
InjectableFactory<R> injectJs1<A, R extends JSAny?>(
  Token<A> a,
  R Function(A a) factory,
) {
  return InjectableFactory<R>._(
    [a],
    () => ((JSAny? aValue) => factory(a.fromJs(aValue))).toJS,
  );
}

/// Creates an injectable factory with two typed dependencies.
InjectableFactory<R> inject2<A, B, R>(
  Token<A> a,
  Token<B> b,
  R Function(A a, B b) factory,
) {
  return InjectableFactory<R>._(
    [a, b],
    () => ((JSAny? aValue, JSAny? bValue) {
      return unsafe.dartToJs(
        factory(
          a.fromJs(aValue),
          b.fromJs(bValue),
        ),
      );
    }).toJS,
  );
}

/// Creates an injectable factory with three typed dependencies.
InjectableFactory<R> inject3<A, B, C, R>(
  Token<A> a,
  Token<B> b,
  Token<C> c,
  R Function(A a, B b, C c) factory,
) {
  return InjectableFactory<R>._(
    [a, b, c],
    () => ((
      JSAny? aValue,
      JSAny? bValue,
      JSAny? cValue,
    ) {
      return unsafe.dartToJs(
        factory(
          a.fromJs(aValue),
          b.fromJs(bValue),
          c.fromJs(cValue),
        ),
      );
    }).toJS,
  );
}

/// Creates an injectable factory with four typed dependencies.
InjectableFactory<R> inject4<A, B, C, D, R>(
  Token<A> a,
  Token<B> b,
  Token<C> c,
  Token<D> d,
  R Function(A a, B b, C c, D d) factory,
) {
  return InjectableFactory<R>._(
    [a, b, c, d],
    () => ((
      JSAny? aValue,
      JSAny? bValue,
      JSAny? cValue,
      JSAny? dValue,
    ) {
      return unsafe.dartToJs(
        factory(
          a.fromJs(aValue),
          b.fromJs(bValue),
          c.fromJs(cValue),
          d.fromJs(dValue),
        ),
      );
    }).toJS,
  );
}

/// Creates an injectable factory with five typed dependencies.
InjectableFactory<R> inject5<A, B, C, D, E, R>(
  Token<A> a,
  Token<B> b,
  Token<C> c,
  Token<D> d,
  Token<E> e,
  R Function(A a, B b, C c, D d, E e) factory,
) {
  return InjectableFactory<R>._(
    [a, b, c, d, e],
    () => ((
      JSAny? aValue,
      JSAny? bValue,
      JSAny? cValue,
      JSAny? dValue,
      JSAny? eValue,
    ) {
      return unsafe.dartToJs(
        factory(
          a.fromJs(aValue),
          b.fromJs(bValue),
          c.fromJs(cValue),
          d.fromJs(dValue),
          e.fromJs(eValue),
        ),
      );
    }).toJS,
  );
}

/// Creates an injectable factory with six typed dependencies.
InjectableFactory<R> inject6<A, B, C, D, E, F, R>(
  Token<A> a,
  Token<B> b,
  Token<C> c,
  Token<D> d,
  Token<E> e,
  Token<F> f,
  R Function(A a, B b, C c, D d, E e, F f) factory,
) {
  return InjectableFactory<R>._(
    [a, b, c, d, e, f],
    () => ((
      JSAny? aValue,
      JSAny? bValue,
      JSAny? cValue,
      JSAny? dValue,
      JSAny? eValue,
      JSAny? fValue,
    ) {
      return unsafe.dartToJs(
        factory(
          a.fromJs(aValue),
          b.fromJs(bValue),
          c.fromJs(cValue),
          d.fromJs(dValue),
          e.fromJs(eValue),
          f.fromJs(fValue),
        ),
      );
    }).toJS,
  );
}

/// Creates an injectable factory with seven typed dependencies.
InjectableFactory<R> inject7<A, B, C, D, E, F, G, R>(
  Token<A> a,
  Token<B> b,
  Token<C> c,
  Token<D> d,
  Token<E> e,
  Token<F> f,
  Token<G> g,
  R Function(A a, B b, C c, D d, E e, F f, G g) factory,
) {
  return InjectableFactory<R>._(
    [a, b, c, d, e, f, g],
    () => ((
      JSAny? aValue,
      JSAny? bValue,
      JSAny? cValue,
      JSAny? dValue,
      JSAny? eValue,
      JSAny? fValue,
      JSAny? gValue,
    ) {
      return unsafe.dartToJs(
        factory(
          a.fromJs(aValue),
          b.fromJs(bValue),
          c.fromJs(cValue),
          d.fromJs(dValue),
          e.fromJs(eValue),
          f.fromJs(fValue),
          g.fromJs(gValue),
        ),
      );
    }).toJS,
  );
}

/// Creates an injectable factory with eight typed dependencies.
InjectableFactory<R> inject8<A, B, C, D, E, F, G, H, R>(
  Token<A> a,
  Token<B> b,
  Token<C> c,
  Token<D> d,
  Token<E> e,
  Token<F> f,
  Token<G> g,
  Token<H> h,
  R Function(A a, B b, C c, D d, E e, F f, G g, H h) factory,
) {
  return InjectableFactory<R>._(
    [a, b, c, d, e, f, g, h],
    () => ((
      JSAny? aValue,
      JSAny? bValue,
      JSAny? cValue,
      JSAny? dValue,
      JSAny? eValue,
      JSAny? fValue,
      JSAny? gValue,
      JSAny? hValue,
    ) {
      return unsafe.dartToJs(
        factory(
          a.fromJs(aValue),
          b.fromJs(bValue),
          c.fromJs(cValue),
          d.fromJs(dValue),
          e.fromJs(eValue),
          f.fromJs(fValue),
          g.fromJs(gValue),
          h.fromJs(hValue),
        ),
      );
    }).toJS,
  );
}

/// Unsafe injection escape hatch for legacy or higher-arity factories.
InjectableFactory<R> injectUnsafe<R>(
  List<String> tokens,
  JSFunction factory,
) {
  return InjectableFactory<R>._(
    [for (final name in tokens) token<Object?>(name)],
    () => factory,
  );
}
