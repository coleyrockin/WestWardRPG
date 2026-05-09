export type BtStatus = "success" | "failure" | "running";
export declare const BT_SUCCESS: BtStatus;
export declare const BT_FAILURE: BtStatus;
export declare const BT_RUNNING: BtStatus;
export interface BtNode {
  type: string;
  children?: BtNode[];
  child?: BtNode;
  fn?: (entity: any, ctx: any) => any;
}
export function sequence(children: BtNode[]): BtNode;
export function selector(children: BtNode[]): BtNode;
export function action(fn: (entity: any, ctx: any) => any): BtNode;
export function condition(fn: (entity: any, ctx: any) => boolean): BtNode;
export function inverter(child: BtNode): BtNode;
export function tick(node: BtNode, entity: any, ctx: any): BtStatus;
