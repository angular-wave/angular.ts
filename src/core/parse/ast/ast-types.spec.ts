import { ASTType } from "../ast-type.ts";
import type {
  ASTNode,
  AssignmentNode,
  CallNode,
  MemberNode,
} from "./ast-node.ts";

const identifier = { _type: ASTType._Identifier, _name: "value" } as const;
const literal = { _type: ASTType._Literal, _value: 42 } as const;
const member: MemberNode = {
  _type: ASTType._MemberExpression,
  _object: identifier,
  _property: literal,
  _computed: true,
};
const call: CallNode = {
  _type: ASTType._CallExpression,
  _callee: member,
  _arguments: [literal],
};
const assignment: AssignmentNode = {
  _type: ASTType._AssignmentExpression,
  _operator: "=",
  _left: member,
  _right: call,
};
const program: ASTNode = {
  _type: ASTType._Program,
  _body: [{ _type: ASTType._ExpressionStatement, _expression: assignment }],
};
// @ts-expect-error a call must provide arguments and a callee.
const missingCall: ASTNode = { _type: ASTType._CallExpression };
const invalidAssignment: AssignmentNode = {
  _type: ASTType._AssignmentExpression,
  _operator: "=",
  // @ts-expect-error literals cannot be assignment targets.
  _left: literal,
  _right: literal,
};
const malformedIdentifier: ASTNode = {
  _type: ASTType._Identifier,
  // @ts-expect-error identifiers have names, not literal payloads.
  _value: "name",
};
// @ts-expect-error the program body contains statement wrappers, not bare expressions.
const malformedProgram: ASTNode = { _type: ASTType._Program, _body: [literal] };
void program;
void missingCall;
void invalidAssignment;
void malformedIdentifier;
void malformedProgram;
