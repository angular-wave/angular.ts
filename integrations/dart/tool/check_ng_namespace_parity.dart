import 'dart:io';

final _ngTypePattern = RegExp(r'^\s*type\s+([A-Za-z0-9_]+)\b');
final _parityTypePattern = RegExp(r'^\|\s*`([^`]+)`\s*\|');

void main() {
  final repoRoot = Directory.current.parent.parent;
  final namespaceFile = File('${repoRoot.path}/@types/namespace.d.ts');
  final parityFile = File('NG_NAMESPACE_PARITY.md');

  if (!namespaceFile.existsSync()) {
    stderr.writeln(
        'Missing ${namespaceFile.path}. Run AngularTS type generation first.');
    exitCode = 1;
    return;
  }

  if (!parityFile.existsSync()) {
    stderr.writeln('Missing ${parityFile.path}.');
    exitCode = 1;
    return;
  }

  final ngTypes = _readNgTypes(namespaceFile);
  final parityTypes = _readParityTypes(parityFile);

  final missing = ngTypes.difference(parityTypes).toList()..sort();
  final stale = parityTypes.difference(ngTypes).toList()..sort();

  if (missing.isEmpty && stale.isEmpty) {
    stdout.writeln(
        'ng namespace parity checklist covers ${ngTypes.length} public types.');
    return;
  }

  if (missing.isNotEmpty) {
    stderr.writeln('Missing Dart parity entries:');
    for (final type in missing) {
      stderr.writeln('- $type');
    }
  }

  if (stale.isNotEmpty) {
    stderr.writeln('Stale Dart parity entries:');
    for (final type in stale) {
      stderr.writeln('- $type');
    }
  }

  exitCode = 1;
}

Set<String> _readNgTypes(File file) {
  final types = <String>{};
  var inNgNamespace = false;

  for (final line in file.readAsLinesSync()) {
    if (line.contains('export namespace ng')) {
      inNgNamespace = true;
      continue;
    }

    if (!inNgNamespace) continue;

    final match = _ngTypePattern.firstMatch(line);

    if (match != null) {
      types.add(match.group(1)!);
    }
  }

  return types;
}

Set<String> _readParityTypes(File file) {
  final types = <String>{};

  for (final line in file.readAsLinesSync()) {
    final match = _parityTypePattern.firstMatch(line);

    if (match == null) continue;

    final value = match.group(1)!;

    if (value == 'ng type') continue;

    types.add(value);
  }

  return types;
}
