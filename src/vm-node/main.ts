import * as assert from "assert";

interface Spec {
  type: string;
  props: {};
}

interface SpecWithState extends Spec {
  type: string;
  props: {
    state: Spec;
  };
}

interface ComponentSpec extends Spec {
  props: {
    producers: Spec[];
    consumers: Spec[];
  };
}

interface GateSpec extends Spec {
  props: {
    conditions: Spec[];
    positive: Spec;
  };
}

interface SwitchSpec extends GateSpec {
  props: {
    conditions: Spec[];
    positive: Spec;
    negative: Spec;
  };
}

interface ValueSpec extends Spec {
  props: {
    value: unknown;
  };
}

interface BroadcastSpec extends Spec {
  props: {
    key: string;
  };
}

class Scope {
  private readonly _broadcasts = new Map<string, Broadcast<unknown>>();

  addBroadcast(key: string, broadcast: Broadcast<unknown>) {
    assert(!this._broadcasts.has(key));
    this._broadcasts.set(key, broadcast);
  }

  addListeners(key: string, listeners: Listener<unknown>[]) {
    this._broadcasts.get(key).addListeners(listeners);
  }
}

class Store<T> {
  private _state: T;

  constructor(spec: Spec, scope: Scope) {
    Stream.create(spec, scope, [new StateListener(this)]);
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }
}

abstract class Stream<O, I> {
  static create(
    spec: Spec,
    scope = new Scope(),
    listeners: Listener<unknown>[] = []
  ): Stream<unknown, unknown> {
    switch (spec.type) {
      case "component":
        return new Component(spec as ComponentSpec, scope, listeners);
      case "gate":
        return new Gate(spec as GateSpec, scope, listeners);
      case "switch":
        return new Switch(spec as SwitchSpec, scope, listeners);
      case "value":
        return new Value(spec as ValueSpec, scope, listeners);
      default: {
        const { default: S } = require(`./api/${spec.type}.tree`);
        return new S(spec, scope, listeners);
      }
    }
  }

  private _input: I;
  private readonly _listeners: Listener<O>[];

  protected constructor(spec: Spec, scope: Scope, listeners: Listener<O>[]) {
    this._listeners = listeners;
  }

  abstract run(): void;

  get input() {
    return this._input;
  }

  set input(value) {
    this._input = value;
    this.run();
  }

  set output(value: O) {
    for (const listener of this._listeners) {
      listener.send(value);
    }
  }
}

abstract class StreamWithState<O, I, S> extends Stream<O, I> {
  private readonly _store: Store<S>;

  constructor(spec: SpecWithState, scope: Scope, listeners: Listener<O>[]) {
    super(spec, scope, listeners);
    this._store = new Store(spec.props.state, scope);
  }

  get state() {
    return this._store.state;
  }
}

class Component<O, I, J> extends Stream<O, I> {
  private readonly _producers: Listener<I>[];

  constructor(spec: ComponentSpec, scope: Scope, listeners: Listener<O>[]) {
    super(spec, scope, listeners);

    const consumers: Listener<J>[] = [];
    for (const consumerSpec of spec.props.consumers) {
      let consumer: Listener<J>;
      if (consumerSpec.type === "broadcast") {
        const broadcast = new Broadcast();
        scope.addBroadcast(
          (consumerSpec as BroadcastSpec).props.key,
          broadcast
        );
        consumer = broadcast;
      } else {
        consumer = new InputListener(
          Stream.create(consumerSpec, scope, [new OutputListener(this)])
        );
      }
      consumers.push(consumer);
    }

    this._producers = [];
    for (const producerSpec of spec.props.producers) {
      if (producerSpec.type === "listener") {
        scope.addListeners(
          (producerSpec as BroadcastSpec).props.key,
          consumers
        );
      } else {
        this._producers.push(
          new InputListener(Stream.create(producerSpec, scope, consumers))
        );
      }
    }
  }

  run() {
    for (const producer of this._producers) {
      producer.send(this.input);
    }
  }
}

abstract class Condition<T> {
  static create(spec: Spec, scope: Scope): Condition<unknown> {
    const { default: C } = require(`./api/${spec.type}.tree`);
    return new C(spec, scope);
  }

  constructor(spec: Spec, scope: Scope) {}

  abstract test(input: T): boolean;
}

abstract class ConditionWithState<T, S> extends Condition<T> {
  private readonly _store: Store<S>;

  constructor(spec: SpecWithState, scope: Scope) {
    super(spec, scope);
    this._store = new Store(spec.props.state, scope);
  }

  get state() {
    return this._store.state;
  }
}

class Gate<O, I> extends Stream<O, I> {
  private _conditions: Condition<I>[];
  private _positive: Stream<O, I>;

  constructor(spec: GateSpec, scope: Scope, listeners: Listener<O>[]) {
    super(spec, scope, listeners);
    this._positive = Stream.create(spec.props.positive, scope, [
      new OutputListener(this)
    ]) as Stream<O, I>;
    this._conditions = [];
    for (const conditionSpec of spec.props.conditions) {
      this._conditions.push(Condition.create(conditionSpec, scope));
    }
  }

  run() {
    let conditionResult = false;
    for (const condition of this._conditions) {
      if (condition.test(this.input)) {
        conditionResult = true;
        break;
      }
    }
    if (conditionResult) {
      this._positive.input = this.input;
    }
    return conditionResult;
  }
}

class Switch<O, I> extends Gate<O, I> {
  private _negative: Stream<O, I>;

  constructor(spec: SwitchSpec, scope: Scope, listeners: Listener<O>[]) {
    super(spec, scope, listeners);
    this._negative = Stream.create(spec.props.negative, scope, [
      new OutputListener(this)
    ]) as Stream<O, I>;
  }

  run() {
    let conditionResult = super.run();
    if (!conditionResult) {
      this._negative.input = this.input;
    }
    return conditionResult;
  }
}

class Value<T> extends Stream<T, null> {
  constructor(spec: ValueSpec, scope: Scope, listeners: Listener<T>[]) {
    super(spec, scope, listeners);
    this.output = spec.props.value as T;
  }

  run() {}
}

abstract class Listener<T> {
  abstract send(value: T): void;
}

class Broadcast<T> extends Listener<T> {
  private readonly _listeners: Listener<T>[] = [];

  addListeners(listeners: Listener<T>[]) {
    this._listeners.push(...listeners);
  }

  send(value: T) {
    setTimeout(() => {
      for (const listener of this._listeners) {
        listener.send(value);
      }
    }, 0);
  }
}

class OutputListener<T> extends Listener<T> {
  private readonly _stream: Stream<T, unknown>;

  constructor(stream: Stream<T, unknown>) {
    super();
    this._stream = stream;
  }

  send(value: T) {
    this._stream.output = value;
  }
}

class InputListener<T> extends Listener<T> {
  private readonly _stream: Stream<unknown, T>;

  constructor(stream: Stream<unknown, T>) {
    super();
    this._stream = stream;
  }

  send(value: T) {
    this._stream.input = value;
  }
}

class StateListener<T> extends Listener<T> {
  private readonly _store: Store<T>;

  constructor(store: Store<T>) {
    super();
    this._store = store;
  }

  send(value: T) {
    this._store.state = value;
  }
}

export { Condition, ConditionWithState, Stream, StreamWithState };

export default function main(spec: Spec) {
  Stream.create(spec);
}
