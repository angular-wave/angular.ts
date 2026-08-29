goog.provide('angular_ts.core');
/**
 * The typed AngularTS browser runtime.
 */
angular_ts.core.angular = angular_ts.generated.angular;
/**
 * Annotate a factory with a ClojureScript collection of dependency names.
 */
angular_ts.core.injectable = (function angular_ts$core$injectable(deps,factory){
return angular_ts.generated.injectable(deps,factory);
});
/**
 * Retrieve or create an AngularTS module.
 */
angular_ts.core.module = (function angular_ts$core$module(var_args){
var G__6010 = arguments.length;
switch (G__6010) {
case 1:
return angular_ts.core.module.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return angular_ts.core.module.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.module.cljs$core$IFn$_invoke$arity$1 = (function (name){
return angular_ts.generated.module.cljs$core$IFn$_invoke$arity$1(name);
}));

(angular_ts.core.module.cljs$core$IFn$_invoke$arity$2 = (function (name,requires){
return angular_ts.generated.module.cljs$core$IFn$_invoke$arity$2(name,requires);
}));

(angular_ts.core.module.cljs$lang$maxFixedArity = 2);

/**
 * Register an injectable value and return the module.
 */
angular_ts.core.value = (function angular_ts$core$value(ng_module,name,object){
return ng_module.value(name,object);
});
/**
 * Register an injectable constant and return the module.
 */
angular_ts.core.constant = (function angular_ts$core$constant(ng_module,name,object){
return ng_module.constant(name,object);
});
/**
 * Apply typed AngularTS configuration and return the module.
 */
angular_ts.core.config = (function angular_ts$core$config(ng_module,options){
return angular_ts.generated.ng_module_config(ng_module,options);
});
/**
 * Register a run block, optionally annotating its dependencies.
 */
angular_ts.core.run = (function angular_ts$core$run(var_args){
var G__6012 = arguments.length;
switch (G__6012) {
case 2:
return angular_ts.core.run.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return angular_ts.core.run.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.run.cljs$core$IFn$_invoke$arity$2 = (function (ng_module,block){
return angular_ts.generated.ng_module_run(ng_module,block);
}));

(angular_ts.core.run.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,deps,block){
return angular_ts.generated.ng_module_run(ng_module,angular_ts.core.injectable(deps,block));
}));

(angular_ts.core.run.cljs$lang$maxFixedArity = 3);

/**
 * Register a component and return the module.
 */
angular_ts.core.component = (function angular_ts$core$component(ng_module,name,options){
return angular_ts.generated.ng_module_component(ng_module,name,options);
});
/**
 * Register a controller, optionally annotating its dependencies.
 */
angular_ts.core.controller = (function angular_ts$core$controller(var_args){
var G__6014 = arguments.length;
switch (G__6014) {
case 3:
return angular_ts.core.controller.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.controller.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.controller.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,factory){
return angular_ts.generated.ng_module_controller(ng_module,name,factory);
}));

(angular_ts.core.controller.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,factory){
return angular_ts.generated.ng_module_controller(ng_module,name,angular_ts.core.injectable(deps,factory));
}));

(angular_ts.core.controller.cljs$lang$maxFixedArity = 4);

/**
 * Register a directive, optionally annotating its dependencies.
 */
angular_ts.core.directive = (function angular_ts$core$directive(var_args){
var G__6016 = arguments.length;
switch (G__6016) {
case 3:
return angular_ts.core.directive.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.directive.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.directive.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,factory){
return angular_ts.generated.ng_module_directive(ng_module,name,factory);
}));

(angular_ts.core.directive.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,factory){
return ng_module.directive(name,angular_ts.core.injectable(deps,factory));
}));

(angular_ts.core.directive.cljs$lang$maxFixedArity = 4);

/**
 * Register a service factory, optionally annotating its dependencies.
 */
angular_ts.core.factory = (function angular_ts$core$factory(var_args){
var G__6018 = arguments.length;
switch (G__6018) {
case 3:
return angular_ts.core.factory.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.factory.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.factory.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,provider_factory){
return angular_ts.generated.ng_module_factory(ng_module,name,provider_factory);
}));

(angular_ts.core.factory.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,provider_factory){
return angular_ts.generated.ng_module_factory(ng_module,name,angular_ts.core.injectable(deps,provider_factory));
}));

(angular_ts.core.factory.cljs$lang$maxFixedArity = 4);

/**
 * Register a service constructor, optionally annotating its dependencies.
 */
angular_ts.core.service = (function angular_ts$core$service(var_args){
var G__6020 = arguments.length;
switch (G__6020) {
case 3:
return angular_ts.core.service.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.service.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.service.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,constructor$){
return angular_ts.generated.ng_module_service(ng_module,name,constructor$);
}));

(angular_ts.core.service.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,constructor$){
return angular_ts.generated.ng_module_service(ng_module,name,angular_ts.core.injectable(deps,constructor$));
}));

(angular_ts.core.service.cljs$lang$maxFixedArity = 4);

/**
 * Register a provider constructor, optionally annotating its dependencies.
 */
angular_ts.core.provider = (function angular_ts$core$provider(var_args){
var G__6022 = arguments.length;
switch (G__6022) {
case 3:
return angular_ts.core.provider.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.provider.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.provider.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,constructor$){
return angular_ts.generated.ng_module_provider(ng_module,name,constructor$);
}));

(angular_ts.core.provider.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,constructor$){
return angular_ts.generated.ng_module_provider(ng_module,name,angular_ts.core.injectable(deps,constructor$));
}));

(angular_ts.core.provider.cljs$lang$maxFixedArity = 4);

/**
 * Decorate an injectable, optionally annotating the decorator dependencies.
 */
angular_ts.core.decorator = (function angular_ts$core$decorator(var_args){
var G__6024 = arguments.length;
switch (G__6024) {
case 3:
return angular_ts.core.decorator.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.decorator.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.decorator.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,decorator_factory){
return angular_ts.generated.ng_module_decorator(ng_module,name,decorator_factory);
}));

(angular_ts.core.decorator.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,decorator_factory){
return angular_ts.generated.ng_module_decorator(ng_module,name,angular_ts.core.injectable(deps,decorator_factory));
}));

(angular_ts.core.decorator.cljs$lang$maxFixedArity = 4);

/**
 * Register an animation factory, optionally annotating its dependencies.
 */
angular_ts.core.animation = (function angular_ts$core$animation(var_args){
var G__6027 = arguments.length;
switch (G__6027) {
case 3:
return angular_ts.core.animation.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.animation.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.animation.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,animation_factory){
return angular_ts.generated.ng_module_animation(ng_module,name,animation_factory);
}));

(angular_ts.core.animation.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,animation_factory){
return angular_ts.generated.ng_module_animation(ng_module,name,angular_ts.core.injectable(deps,animation_factory));
}));

(angular_ts.core.animation.cljs$lang$maxFixedArity = 4);

/**
 * Register a filter factory, optionally annotating its dependencies.
 */
angular_ts.core.filter = (function angular_ts$core$filter(var_args){
var G__6029 = arguments.length;
switch (G__6029) {
case 3:
return angular_ts.core.filter.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.filter.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.filter.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,filter_factory){
return ng_module.filter(name,filter_factory);
}));

(angular_ts.core.filter.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,filter_factory){
return ng_module.filter(name,angular_ts.core.injectable(deps,filter_factory));
}));

(angular_ts.core.filter.cljs$lang$maxFixedArity = 4);

/**
 * Register a reactive model value or dependency-annotated model factory.
 */
angular_ts.core.model = (function angular_ts$core$model(var_args){
var G__6031 = arguments.length;
switch (G__6031) {
case 3:
return angular_ts.core.model.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.model.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.model.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,initial){
return ng_module.model(name,initial);
}));

(angular_ts.core.model.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,factory){
return ng_module.model(name,angular_ts.core.injectable(deps,factory));
}));

(angular_ts.core.model.cljs$lang$maxFixedArity = 4);

/**
 * Register a machine definition or dependency-annotated machine factory.
 */
angular_ts.core.machine = (function angular_ts$core$machine(var_args){
var G__6033 = arguments.length;
switch (G__6033) {
case 3:
return angular_ts.core.machine.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.machine.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.machine.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,definition){
return angular_ts.generated.ng_module_machine(ng_module,name,definition);
}));

(angular_ts.core.machine.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,factory){
return angular_ts.generated.ng_module_machine(ng_module,name,angular_ts.core.injectable(deps,factory));
}));

(angular_ts.core.machine.cljs$lang$maxFixedArity = 4);

/**
 * Register a workflow definition or dependency-annotated workflow factory.
 */
angular_ts.core.workflow = (function angular_ts$core$workflow(var_args){
var G__6037 = arguments.length;
switch (G__6037) {
case 3:
return angular_ts.core.workflow.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.workflow.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.workflow.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,definition){
return angular_ts.generated.ng_module_workflow(ng_module,name,definition);
}));

(angular_ts.core.workflow.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,factory){
return angular_ts.generated.ng_module_workflow(ng_module,name,angular_ts.core.injectable(deps,factory));
}));

(angular_ts.core.workflow.cljs$lang$maxFixedArity = 4);

/**
 * Register a workflow supervisor definition or annotated factory.
 */
angular_ts.core.workflow_supervisor = (function angular_ts$core$workflow_supervisor(var_args){
var G__6040 = arguments.length;
switch (G__6040) {
case 3:
return angular_ts.core.workflow_supervisor.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.workflow_supervisor.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.workflow_supervisor.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,definition){
return ng_module.workflowSupervisor(name,definition);
}));

(angular_ts.core.workflow_supervisor.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,factory){
return ng_module.workflowSupervisor(name,angular_ts.core.injectable(deps,factory));
}));

(angular_ts.core.workflow_supervisor.cljs$lang$maxFixedArity = 4);

/**
 * Register a router state tree and return the typed router module.
 */
angular_ts.core.router = (function angular_ts$core$router(ng_module,declaration){
return ng_module.router(declaration);
});
/**
 * Register a lazy router state namespace and return the module.
 */
angular_ts.core.lazy_state = (function angular_ts$core$lazy_state(ng_module,prefix,loader){
return ng_module.lazyState(prefix,loader);
});
/**
 * Register a WebAssembly resource definition or annotated factory.
 */
angular_ts.core.wasm = (function angular_ts$core$wasm(var_args){
var G__6044 = arguments.length;
switch (G__6044) {
case 3:
return angular_ts.core.wasm.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.wasm.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.wasm.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,options){
return ng_module.wasm(name,options);
}));

(angular_ts.core.wasm.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,deps,factory){
return ng_module.wasm(name,angular_ts.core.injectable(deps,factory));
}));

(angular_ts.core.wasm.cljs$lang$maxFixedArity = 4);

/**
 * Register a managed worker and return the module.
 */
angular_ts.core.worker = (function angular_ts$core$worker(var_args){
var G__6046 = arguments.length;
switch (G__6046) {
case 3:
return angular_ts.core.worker.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.worker.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.worker.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,script){
return ng_module.worker(name,script);
}));

(angular_ts.core.worker.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,script,options){
return ng_module.worker(name,script,options);
}));

(angular_ts.core.worker.cljs$lang$maxFixedArity = 4);

/**
 * Configure the application service worker and return the module.
 */
angular_ts.core.service_worker = (function angular_ts$core$service_worker(var_args){
var G__6049 = arguments.length;
switch (G__6049) {
case 2:
return angular_ts.core.service_worker.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return angular_ts.core.service_worker.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.service_worker.cljs$core$IFn$_invoke$arity$2 = (function (ng_module,script){
return ng_module.serviceWorker(script);
}));

(angular_ts.core.service_worker.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,script,options){
return ng_module.serviceWorker(script,options);
}));

(angular_ts.core.service_worker.cljs$lang$maxFixedArity = 3);

/**
 * Register a persistent store and return the module.
 */
angular_ts.core.store = (function angular_ts$core$store(var_args){
var G__6051 = arguments.length;
switch (G__6051) {
case 4:
return angular_ts.core.store.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
case 5:
return angular_ts.core.store.cljs$core$IFn$_invoke$arity$5((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]),(arguments[(4)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.store.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,constructor$,storage_type){
return ng_module.store(name,constructor$,storage_type);
}));

(angular_ts.core.store.cljs$core$IFn$_invoke$arity$5 = (function (ng_module,name,constructor$,storage_type,options){
return ng_module.store(name,constructor$,storage_type,options);
}));

(angular_ts.core.store.cljs$lang$maxFixedArity = 5);

/**
 * Register a REST resource and return the module.
 */
angular_ts.core.rest = (function angular_ts$core$rest(var_args){
var G__6053 = arguments.length;
switch (G__6053) {
case 3:
return angular_ts.core.rest.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.rest.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
case 5:
return angular_ts.core.rest.cljs$core$IFn$_invoke$arity$5((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]),(arguments[(4)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.rest.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,url){
return ng_module.rest(name,url);
}));

(angular_ts.core.rest.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,url,entity_class){
return ng_module.rest(name,url,entity_class);
}));

(angular_ts.core.rest.cljs$core$IFn$_invoke$arity$5 = (function (ng_module,name,url,entity_class,options){
return ng_module.rest(name,url,entity_class,options);
}));

(angular_ts.core.rest.cljs$lang$maxFixedArity = 5);

/**
 * Register a server-sent events connection and return the module.
 */
angular_ts.core.sse = (function angular_ts$core$sse(var_args){
var G__6056 = arguments.length;
switch (G__6056) {
case 3:
return angular_ts.core.sse.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.sse.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.sse.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,url){
return ng_module.sse(name,url);
}));

(angular_ts.core.sse.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,url,options){
return ng_module.sse(name,url,options);
}));

(angular_ts.core.sse.cljs$lang$maxFixedArity = 4);

/**
 * Register a WebSocket connection and return the module.
 */
angular_ts.core.websocket = (function angular_ts$core$websocket(var_args){
var G__6058 = arguments.length;
switch (G__6058) {
case 3:
return angular_ts.core.websocket.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.websocket.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.websocket.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,url){
return ng_module.websocket(name,url);
}));

(angular_ts.core.websocket.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,url,options){
return ng_module.websocket(name,url,options);
}));

(angular_ts.core.websocket.cljs$lang$maxFixedArity = 4);

/**
 * Register a WebTransport connection and return the module.
 */
angular_ts.core.web_transport = (function angular_ts$core$web_transport(var_args){
var G__6060 = arguments.length;
switch (G__6060) {
case 3:
return angular_ts.core.web_transport.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.web_transport.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.web_transport.cljs$core$IFn$_invoke$arity$3 = (function (ng_module,name,url){
return ng_module.webTransport(name,url);
}));

(angular_ts.core.web_transport.cljs$core$IFn$_invoke$arity$4 = (function (ng_module,name,url,options){
return ng_module.webTransport(name,url,options);
}));

(angular_ts.core.web_transport.cljs$lang$maxFixedArity = 4);

/**
 * Register an application-host custom element and return the module.
 */
angular_ts.core.app_component = (function angular_ts$core$app_component(ng_module,name,options){
return angular_ts.generated.ng_module_app_component(ng_module,name,options);
});
/**
 * Register an AngularTS-backed custom element and return the module.
 */
angular_ts.core.web_component = (function angular_ts$core$web_component(ng_module,name,element_class){
return angular_ts.generated.ng_module_web_component(ng_module,name,element_class);
});
/**
 * Publish an event-bus value with idiomatic ClojureScript arities.
 */
angular_ts.core.publish = (function angular_ts$core$publish(var_args){
var G__6062 = arguments.length;
switch (G__6062) {
case 2:
return angular_ts.core.publish.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
case 3:
return angular_ts.core.publish.cljs$core$IFn$_invoke$arity$3((arguments[(0)]),(arguments[(1)]),(arguments[(2)]));

break;
case 4:
return angular_ts.core.publish.cljs$core$IFn$_invoke$arity$4((arguments[(0)]),(arguments[(1)]),(arguments[(2)]),(arguments[(3)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(angular_ts.core.publish.cljs$core$IFn$_invoke$arity$2 = (function (event_bus,topic){
return angular_ts.generated.event_bus_service_publish.cljs$core$IFn$_invoke$arity$2(event_bus,topic);
}));

(angular_ts.core.publish.cljs$core$IFn$_invoke$arity$3 = (function (event_bus,topic,value){
return angular_ts.generated.event_bus_service_publish.cljs$core$IFn$_invoke$arity$3(event_bus,topic,value);
}));

(angular_ts.core.publish.cljs$core$IFn$_invoke$arity$4 = (function (event_bus,topic,value,extra){
return angular_ts.generated.event_bus_service_publish.cljs$core$IFn$_invoke$arity$4(event_bus,topic,value,extra);
}));

(angular_ts.core.publish.cljs$lang$maxFixedArity = 4);


//# sourceMappingURL=angular_ts.core.js.map
