"use client";

import { ChallengeRunner, type ChallengeRunnerProps } from "./ChallengeRunner";

export type NarrativeRunnerProps = ChallengeRunnerProps;

export function NarrativeRunner(props: NarrativeRunnerProps): JSX.Element {
  return <ChallengeRunner {...props} diagnosticMode={props.diagnosticMode ?? false} />;
}
