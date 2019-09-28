import { DelegateProcessRunner, DelegateProcessSpec } from "../main";

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
  spec: ValueProducerDelegateProcessSpec<T>;

  init() {
    this.process.state = this.spec.props.value;
    this.process.output = this.process.state;
  }
}
