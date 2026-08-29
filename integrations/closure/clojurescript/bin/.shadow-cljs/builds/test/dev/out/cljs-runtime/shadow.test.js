goog.provide('shadow.test');
/**
 * like ct/test-vars-block but more generic
 * groups vars by namespace, executes fixtures
 */
shadow.test.test_vars_grouped_block = (function shadow$test$test_vars_grouped_block(vars){
return cljs.core.mapcat.cljs$core$IFn$_invoke$arity$variadic((function (p__9947){
var vec__9948 = p__9947;
var ns = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__9948,(0),null);
var vars__$1 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__9948,(1),null);
return new cljs.core.PersistentVector(null, 3, 5, cljs.core.PersistentVector.EMPTY_NODE, [(function (){
return cljs.test.report.call(null,new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"type","type",1174270348),new cljs.core.Keyword(null,"begin-test-ns","begin-test-ns",-1701237033),new cljs.core.Keyword(null,"ns","ns",441598760),ns], null));
}),(function (){
return cljs.test.block((function (){var env = cljs.test.get_current_env();
var once_fixtures = cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(env,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"once-fixtures","once-fixtures",1253947167),ns], null));
var each_fixtures = cljs.core.get_in.cljs$core$IFn$_invoke$arity$2(env,new cljs.core.PersistentVector(null, 2, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"each-fixtures","each-fixtures",802243977),ns], null));
var G__9956 = cljs.test.execution_strategy(once_fixtures,each_fixtures);
var G__9956__$1 = (((G__9956 instanceof cljs.core.Keyword))?G__9956.fqn:null);
switch (G__9956__$1) {
case "async":
return cljs.test.wrap_map_fixtures(once_fixtures,cljs.core.mapcat.cljs$core$IFn$_invoke$arity$variadic(cljs.core.comp.cljs$core$IFn$_invoke$arity$2(cljs.core.partial.cljs$core$IFn$_invoke$arity$2(cljs.test.wrap_map_fixtures,each_fixtures),cljs.test.test_var_block),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([cljs.core.filter.cljs$core$IFn$_invoke$arity$2(cljs.core.comp.cljs$core$IFn$_invoke$arity$2(new cljs.core.Keyword(null,"test","test",577538877),cljs.core.meta),vars__$1)], 0)));

break;
case "sync":
var each_fixture_fn = cljs.test.join_fixtures(each_fixtures);
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(function (){
var G__9963 = (function (){
var seq__9967 = cljs.core.seq(vars__$1);
var chunk__9968 = null;
var count__9969 = (0);
var i__9970 = (0);
while(true){
if((i__9970 < count__9969)){
var v = chunk__9968.cljs$core$IIndexed$_nth$arity$2(null,i__9970);
var temp__5825__auto___10195 = new cljs.core.Keyword(null,"test","test",577538877).cljs$core$IFn$_invoke$arity$1(cljs.core.meta(v));
if(cljs.core.truth_(temp__5825__auto___10195)){
var t_10196 = temp__5825__auto___10195;
var G__9989_10197 = ((function (seq__9967,chunk__9968,count__9969,i__9970,t_10196,temp__5825__auto___10195,v,each_fixture_fn,G__9956,G__9956__$1,env,once_fixtures,each_fixtures,vec__9948,ns,vars__$1){
return (function (){
return cljs.test.run_block(cljs.test.test_var_block_STAR_(v,cljs.test.disable_async(t_10196)));
});})(seq__9967,chunk__9968,count__9969,i__9970,t_10196,temp__5825__auto___10195,v,each_fixture_fn,G__9956,G__9956__$1,env,once_fixtures,each_fixtures,vec__9948,ns,vars__$1))
;
(each_fixture_fn.cljs$core$IFn$_invoke$arity$1 ? each_fixture_fn.cljs$core$IFn$_invoke$arity$1(G__9989_10197) : each_fixture_fn.call(null,G__9989_10197));
} else {
}


var G__10198 = seq__9967;
var G__10199 = chunk__9968;
var G__10200 = count__9969;
var G__10201 = (i__9970 + (1));
seq__9967 = G__10198;
chunk__9968 = G__10199;
count__9969 = G__10200;
i__9970 = G__10201;
continue;
} else {
var temp__5825__auto__ = cljs.core.seq(seq__9967);
if(temp__5825__auto__){
var seq__9967__$1 = temp__5825__auto__;
if(cljs.core.chunked_seq_QMARK_(seq__9967__$1)){
var c__5694__auto__ = cljs.core.chunk_first(seq__9967__$1);
var G__10202 = cljs.core.chunk_rest(seq__9967__$1);
var G__10203 = c__5694__auto__;
var G__10204 = cljs.core.count(c__5694__auto__);
var G__10205 = (0);
seq__9967 = G__10202;
chunk__9968 = G__10203;
count__9969 = G__10204;
i__9970 = G__10205;
continue;
} else {
var v = cljs.core.first(seq__9967__$1);
var temp__5825__auto___10206__$1 = new cljs.core.Keyword(null,"test","test",577538877).cljs$core$IFn$_invoke$arity$1(cljs.core.meta(v));
if(cljs.core.truth_(temp__5825__auto___10206__$1)){
var t_10207 = temp__5825__auto___10206__$1;
var G__10002_10208 = ((function (seq__9967,chunk__9968,count__9969,i__9970,t_10207,temp__5825__auto___10206__$1,v,seq__9967__$1,temp__5825__auto__,each_fixture_fn,G__9956,G__9956__$1,env,once_fixtures,each_fixtures,vec__9948,ns,vars__$1){
return (function (){
return cljs.test.run_block(cljs.test.test_var_block_STAR_(v,cljs.test.disable_async(t_10207)));
});})(seq__9967,chunk__9968,count__9969,i__9970,t_10207,temp__5825__auto___10206__$1,v,seq__9967__$1,temp__5825__auto__,each_fixture_fn,G__9956,G__9956__$1,env,once_fixtures,each_fixtures,vec__9948,ns,vars__$1))
;
(each_fixture_fn.cljs$core$IFn$_invoke$arity$1 ? each_fixture_fn.cljs$core$IFn$_invoke$arity$1(G__10002_10208) : each_fixture_fn.call(null,G__10002_10208));
} else {
}


var G__10209 = cljs.core.next(seq__9967__$1);
var G__10210 = null;
var G__10211 = (0);
var G__10212 = (0);
seq__9967 = G__10209;
chunk__9968 = G__10210;
count__9969 = G__10211;
i__9970 = G__10212;
continue;
}
} else {
return null;
}
}
break;
}
});
var fexpr__9962 = cljs.test.join_fixtures(once_fixtures);
return (fexpr__9962.cljs$core$IFn$_invoke$arity$1 ? fexpr__9962.cljs$core$IFn$_invoke$arity$1(G__9963) : fexpr__9962.call(null,G__9963));
})], null);

break;
default:
throw (new Error((""+"No matching clause: "+cljs.core.str.cljs$core$IFn$_invoke$arity$1(G__9956__$1))));

}
})());
}),(function (){
return cljs.test.report.call(null,new cljs.core.PersistentArrayMap(null, 2, [new cljs.core.Keyword(null,"type","type",1174270348),new cljs.core.Keyword(null,"end-test-ns","end-test-ns",1620675645),new cljs.core.Keyword(null,"ns","ns",441598760),ns], null));
})], null);
}),cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([cljs.core.sort_by.cljs$core$IFn$_invoke$arity$2(cljs.core.first,cljs.core.group_by((function (p1__9919_SHARP_){
return new cljs.core.Keyword(null,"ns","ns",441598760).cljs$core$IFn$_invoke$arity$1(cljs.core.meta(p1__9919_SHARP_));
}),vars))], 0));
});
/**
 * Like test-ns, but returns a block for further composition and
 *   later execution.  Does not clear the current env.
 */
shadow.test.test_ns_block = (function shadow$test$test_ns_block(ns){
if((ns instanceof cljs.core.Symbol)){
} else {
throw (new Error("Assert failed: (symbol? ns)"));
}

var map__10025 = shadow.test.env.get_test_ns_info(ns);
var map__10025__$1 = cljs.core.__destructure_map(map__10025);
var test_ns = map__10025__$1;
var vars = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__10025__$1,new cljs.core.Keyword(null,"vars","vars",-2046957217));
if(cljs.core.not(test_ns)){
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(function (){
return cljs.core.println.cljs$core$IFn$_invoke$arity$variadic(cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([(""+"Namespace: "+cljs.core.str.cljs$core$IFn$_invoke$arity$1(ns)+" not found, no tests to run.")], 0));
})], null);
} else {
return shadow.test.test_vars_grouped_block(vars);
}
});
shadow.test.prepare_test_run = (function shadow$test$prepare_test_run(p__10031,vars){
var map__10032 = p__10031;
var map__10032__$1 = cljs.core.__destructure_map(map__10032);
var env = map__10032__$1;
var report_fn = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__10032__$1,new cljs.core.Keyword(null,"report-fn","report-fn",-549046115));
var orig_report = cljs.test.report;
return new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [(function (){
cljs.test.set_env_BANG_(cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(env,new cljs.core.Keyword("shadow.test","report-fn","shadow.test/report-fn",1075704061),orig_report));

if(cljs.core.truth_(report_fn)){
(cljs.test.report = report_fn);
} else {
}

var seq__10035_10213 = cljs.core.seq(shadow.test.env.get_tests());
var chunk__10037_10214 = null;
var count__10038_10215 = (0);
var i__10039_10216 = (0);
while(true){
if((i__10039_10216 < count__10038_10215)){
var vec__10059_10217 = chunk__10037_10214.cljs$core$IIndexed$_nth$arity$2(null,i__10039_10216);
var test_ns_10218 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__10059_10217,(0),null);
var ns_info_10219 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__10059_10217,(1),null);
var map__10062_10220 = ns_info_10219;
var map__10062_10221__$1 = cljs.core.__destructure_map(map__10062_10220);
var fixtures_10222 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__10062_10221__$1,new cljs.core.Keyword(null,"fixtures","fixtures",1009814994));
var temp__5825__auto___10223 = new cljs.core.Keyword(null,"once","once",-262568523).cljs$core$IFn$_invoke$arity$1(fixtures_10222);
if(cljs.core.truth_(temp__5825__auto___10223)){
var fix_10224 = temp__5825__auto___10223;
cljs.test.update_current_env_BANG_.cljs$core$IFn$_invoke$arity$variadic(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"once-fixtures","once-fixtures",1253947167)], null),cljs.core.assoc,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([test_ns_10218,fix_10224], 0));
} else {
}

var temp__5825__auto___10225 = new cljs.core.Keyword(null,"each","each",940016129).cljs$core$IFn$_invoke$arity$1(fixtures_10222);
if(cljs.core.truth_(temp__5825__auto___10225)){
var fix_10226 = temp__5825__auto___10225;
cljs.test.update_current_env_BANG_.cljs$core$IFn$_invoke$arity$variadic(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"each-fixtures","each-fixtures",802243977)], null),cljs.core.assoc,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([test_ns_10218,fix_10226], 0));
} else {
}


var G__10227 = seq__10035_10213;
var G__10228 = chunk__10037_10214;
var G__10229 = count__10038_10215;
var G__10230 = (i__10039_10216 + (1));
seq__10035_10213 = G__10227;
chunk__10037_10214 = G__10228;
count__10038_10215 = G__10229;
i__10039_10216 = G__10230;
continue;
} else {
var temp__5825__auto___10231 = cljs.core.seq(seq__10035_10213);
if(temp__5825__auto___10231){
var seq__10035_10232__$1 = temp__5825__auto___10231;
if(cljs.core.chunked_seq_QMARK_(seq__10035_10232__$1)){
var c__5694__auto___10233 = cljs.core.chunk_first(seq__10035_10232__$1);
var G__10234 = cljs.core.chunk_rest(seq__10035_10232__$1);
var G__10235 = c__5694__auto___10233;
var G__10236 = cljs.core.count(c__5694__auto___10233);
var G__10237 = (0);
seq__10035_10213 = G__10234;
chunk__10037_10214 = G__10235;
count__10038_10215 = G__10236;
i__10039_10216 = G__10237;
continue;
} else {
var vec__10069_10238 = cljs.core.first(seq__10035_10232__$1);
var test_ns_10239 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__10069_10238,(0),null);
var ns_info_10240 = cljs.core.nth.cljs$core$IFn$_invoke$arity$3(vec__10069_10238,(1),null);
var map__10073_10241 = ns_info_10240;
var map__10073_10242__$1 = cljs.core.__destructure_map(map__10073_10241);
var fixtures_10243 = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__10073_10242__$1,new cljs.core.Keyword(null,"fixtures","fixtures",1009814994));
var temp__5825__auto___10244__$1 = new cljs.core.Keyword(null,"once","once",-262568523).cljs$core$IFn$_invoke$arity$1(fixtures_10243);
if(cljs.core.truth_(temp__5825__auto___10244__$1)){
var fix_10245 = temp__5825__auto___10244__$1;
cljs.test.update_current_env_BANG_.cljs$core$IFn$_invoke$arity$variadic(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"once-fixtures","once-fixtures",1253947167)], null),cljs.core.assoc,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([test_ns_10239,fix_10245], 0));
} else {
}

var temp__5825__auto___10246__$1 = new cljs.core.Keyword(null,"each","each",940016129).cljs$core$IFn$_invoke$arity$1(fixtures_10243);
if(cljs.core.truth_(temp__5825__auto___10246__$1)){
var fix_10247 = temp__5825__auto___10246__$1;
cljs.test.update_current_env_BANG_.cljs$core$IFn$_invoke$arity$variadic(new cljs.core.PersistentVector(null, 1, 5, cljs.core.PersistentVector.EMPTY_NODE, [new cljs.core.Keyword(null,"each-fixtures","each-fixtures",802243977)], null),cljs.core.assoc,cljs.core.prim_seq.cljs$core$IFn$_invoke$arity$2([test_ns_10239,fix_10247], 0));
} else {
}


var G__10248 = cljs.core.next(seq__10035_10232__$1);
var G__10249 = null;
var G__10250 = (0);
var G__10251 = (0);
seq__10035_10213 = G__10248;
chunk__10037_10214 = G__10249;
count__10038_10215 = G__10250;
i__10039_10216 = G__10251;
continue;
}
} else {
}
}
break;
}

return cljs.test.report.call(null,new cljs.core.PersistentArrayMap(null, 3, [new cljs.core.Keyword(null,"type","type",1174270348),new cljs.core.Keyword(null,"begin-run-tests","begin-run-tests",309363062),new cljs.core.Keyword(null,"var-count","var-count",-1513152110),cljs.core.count(vars),new cljs.core.Keyword(null,"ns-count","ns-count",-1269070724),cljs.core.count(cljs.core.set(cljs.core.map.cljs$core$IFn$_invoke$arity$2((function (p1__10029_SHARP_){
return new cljs.core.Keyword(null,"ns","ns",441598760).cljs$core$IFn$_invoke$arity$1(cljs.core.meta(p1__10029_SHARP_));
}),vars)))], null));
})], null);
});
shadow.test.finish_test_run = (function shadow$test$finish_test_run(block){
if(cljs.core.vector_QMARK_(block)){
} else {
throw (new Error("Assert failed: (vector? block)"));
}

return cljs.core.conj.cljs$core$IFn$_invoke$arity$2(block,(function (){
var map__10088 = cljs.test.get_current_env();
var map__10088__$1 = cljs.core.__destructure_map(map__10088);
var env = map__10088__$1;
var report_fn = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__10088__$1,new cljs.core.Keyword("shadow.test","report-fn","shadow.test/report-fn",1075704061));
var report_counters = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__10088__$1,new cljs.core.Keyword(null,"report-counters","report-counters",-1702609242));
cljs.test.report.call(null,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(report_counters,new cljs.core.Keyword(null,"type","type",1174270348),new cljs.core.Keyword(null,"summary","summary",380847952)));

cljs.test.report.call(null,cljs.core.assoc.cljs$core$IFn$_invoke$arity$3(report_counters,new cljs.core.Keyword(null,"type","type",1174270348),new cljs.core.Keyword(null,"end-run-tests","end-run-tests",267300563)));

return (cljs.test.report = report_fn);
}));
});
/**
 * tests all vars grouped by namespace, expects seq of test vars, can be obtained from env
 */
shadow.test.run_test_vars = (function shadow$test$run_test_vars(var_args){
var G__10102 = arguments.length;
switch (G__10102) {
case 1:
return shadow.test.run_test_vars.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.test.run_test_vars.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(shadow.test.run_test_vars.cljs$core$IFn$_invoke$arity$1 = (function (test_vars){
return shadow.test.run_test_vars.cljs$core$IFn$_invoke$arity$2(cljs.test.empty_env.cljs$core$IFn$_invoke$arity$0(),test_vars);
}));

(shadow.test.run_test_vars.cljs$core$IFn$_invoke$arity$2 = (function (env,vars){
return cljs.test.run_block(shadow.test.finish_test_run(cljs.core.into.cljs$core$IFn$_invoke$arity$2(shadow.test.prepare_test_run(env,vars),shadow.test.test_vars_grouped_block(vars))));
}));

(shadow.test.run_test_vars.cljs$lang$maxFixedArity = 2);

/**
 * test all vars for given namespace symbol
 */
shadow.test.test_ns = (function shadow$test$test_ns(var_args){
var G__10134 = arguments.length;
switch (G__10134) {
case 1:
return shadow.test.test_ns.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.test.test_ns.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(shadow.test.test_ns.cljs$core$IFn$_invoke$arity$1 = (function (ns){
return shadow.test.test_ns.cljs$core$IFn$_invoke$arity$2(cljs.test.empty_env.cljs$core$IFn$_invoke$arity$0(),ns);
}));

(shadow.test.test_ns.cljs$core$IFn$_invoke$arity$2 = (function (env,ns){
var map__10141 = shadow.test.env.get_test_ns_info(ns);
var map__10141__$1 = cljs.core.__destructure_map(map__10141);
var vars = cljs.core.get.cljs$core$IFn$_invoke$arity$2(map__10141__$1,new cljs.core.Keyword(null,"vars","vars",-2046957217));
return cljs.test.run_block(shadow.test.finish_test_run(cljs.core.into.cljs$core$IFn$_invoke$arity$2(shadow.test.prepare_test_run(env,vars),shadow.test.test_vars_grouped_block(vars))));
}));

(shadow.test.test_ns.cljs$lang$maxFixedArity = 2);

/**
 * test all vars in specified namespace symbol set
 */
shadow.test.run_tests = (function shadow$test$run_tests(var_args){
var G__10151 = arguments.length;
switch (G__10151) {
case 0:
return shadow.test.run_tests.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return shadow.test.run_tests.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.test.run_tests.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(shadow.test.run_tests.cljs$core$IFn$_invoke$arity$0 = (function (){
return shadow.test.run_tests.cljs$core$IFn$_invoke$arity$1(cljs.test.empty_env.cljs$core$IFn$_invoke$arity$0());
}));

(shadow.test.run_tests.cljs$core$IFn$_invoke$arity$1 = (function (env){
return shadow.test.run_tests.cljs$core$IFn$_invoke$arity$2(env,shadow.test.env.get_test_namespaces());
}));

(shadow.test.run_tests.cljs$core$IFn$_invoke$arity$2 = (function (env,namespaces){
if(cljs.core.set_QMARK_(namespaces)){
} else {
throw (new Error("Assert failed: (set? namespaces)"));
}

var vars = cljs.core.filter.cljs$core$IFn$_invoke$arity$2((function (p1__10147_SHARP_){
return cljs.core.contains_QMARK_(namespaces,new cljs.core.Keyword(null,"ns","ns",441598760).cljs$core$IFn$_invoke$arity$1(cljs.core.meta(p1__10147_SHARP_)));
}),shadow.test.env.get_test_vars());
return cljs.test.run_block(shadow.test.finish_test_run(cljs.core.into.cljs$core$IFn$_invoke$arity$2(shadow.test.prepare_test_run(env,vars),shadow.test.test_vars_grouped_block(vars))));
}));

(shadow.test.run_tests.cljs$lang$maxFixedArity = 2);

/**
 * Runs all tests in all namespaces; prints results.
 *   Optional argument is a regular expression; only namespaces with
 *   names matching the regular expression (with re-matches) will be
 *   tested.
 */
shadow.test.run_all_tests = (function shadow$test$run_all_tests(var_args){
var G__10159 = arguments.length;
switch (G__10159) {
case 0:
return shadow.test.run_all_tests.cljs$core$IFn$_invoke$arity$0();

break;
case 1:
return shadow.test.run_all_tests.cljs$core$IFn$_invoke$arity$1((arguments[(0)]));

break;
case 2:
return shadow.test.run_all_tests.cljs$core$IFn$_invoke$arity$2((arguments[(0)]),(arguments[(1)]));

break;
default:
throw (new Error(["Invalid arity: ",arguments.length].join("")));

}
});

(shadow.test.run_all_tests.cljs$core$IFn$_invoke$arity$0 = (function (){
return shadow.test.run_all_tests.cljs$core$IFn$_invoke$arity$2(cljs.test.empty_env.cljs$core$IFn$_invoke$arity$0(),null);
}));

(shadow.test.run_all_tests.cljs$core$IFn$_invoke$arity$1 = (function (env){
return shadow.test.run_all_tests.cljs$core$IFn$_invoke$arity$2(env,null);
}));

(shadow.test.run_all_tests.cljs$core$IFn$_invoke$arity$2 = (function (env,re){
return shadow.test.run_tests.cljs$core$IFn$_invoke$arity$2(env,cljs.core.into.cljs$core$IFn$_invoke$arity$2(cljs.core.PersistentHashSet.EMPTY,cljs.core.filter.cljs$core$IFn$_invoke$arity$2((function (p1__10152_SHARP_){
var or__5162__auto__ = (re == null);
if(or__5162__auto__){
return or__5162__auto__;
} else {
return cljs.core.re_matches(re,(""+cljs.core.str.cljs$core$IFn$_invoke$arity$1(p1__10152_SHARP_)));
}
}),shadow.test.env.get_test_namespaces())));
}));

(shadow.test.run_all_tests.cljs$lang$maxFixedArity = 2);


//# sourceMappingURL=shadow.test.js.map
