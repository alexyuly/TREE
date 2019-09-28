import {
  DelegateProcess,
  DelegateProcessRunner,
  DelegateProcessSpec
} from "../main";

interface ValueProducerDelegateProcessSpec<S>
  extends DelegateProcessSpec<S, void, S> {
  type: "value-producer";
  props: {
    state?: null;
    value: S;
  };
}

export default class ValueProducer<T> extends DelegateProcessRunner<
  T,
  void,
  T
> {
  constructor(
    process: DelegateProcess<T, void, T>,
    spec: ValueProducerDelegateProcessSpec<T>
  ) {
    super();
    process.state = spec.props.value;
    process.output = process.state;
  }
}
