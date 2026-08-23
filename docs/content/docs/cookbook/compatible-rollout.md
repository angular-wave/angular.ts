---
title: Roll out a request contract without breaking old pages
description: Expand, migrate, and contract server behavior across cached browser versions
weight: 78
---

## Problem

A deployment changes a field or response shape while users still have pages,
workers, or tabs running code from the previous release.

## Before you start

Measure how long old clients and cached pages remain active. Identify producers,
consumers, integrations, queued jobs, and persisted data using the contract.

## Use an expand-and-contract rollout

First make the server accept old and new requests. Then deploy clients that use
the new shape. Observe adoption and errors. Migrate stored data and background
producers. Remove old behavior only after the supported compatibility window.

## Server contract

Ignore additive response fields safely, preserve field meaning, and use a new field
or endpoint for incompatible semantics. Keep rollback possible throughout rollout.

## Failure path

Do not rename or repurpose a field in one deployment, assume all tabs refresh, or
couple database migration completion to a single frontend release instant.

## Apply it now

Take the next contract change and write its expand, client migration, observation,
data migration, and removal steps before implementation begins.

## Verify

Run old client against new server, new client against compatible old behavior,
mixed workers, rollback, delayed jobs, and a tab kept open across deployment.
