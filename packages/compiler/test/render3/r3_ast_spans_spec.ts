/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ParseSourceSpan} from '../../src/parse_util';
import * as t from '../../src/render3/r3_ast';
import {parseR3 as parse} from './view/util';


class R3AstSourceSpans implements t.Visitor<void> {
  result: any[] = [];

  visitElement(element: t.Element) {
    this.result.push([
      'Element', humanizeSpan(element.sourceSpan), humanizeSpan(element.startSourceSpan),
      humanizeSpan(element.endSourceSpan)
    ]);
    this.visitAll([
      element.attributes,
      element.inputs,
      element.outputs,
      element.references,
      element.children,
    ]);
  }

  visitTemplate(template: t.Template) {
    this.result.push([
      'Template', humanizeSpan(template.sourceSpan), humanizeSpan(template.startSourceSpan),
      humanizeSpan(template.endSourceSpan)
    ]);
    this.visitAll([
      template.attributes,
      template.inputs,
      template.outputs,
      template.templateAttrs,
      template.references,
      template.variables,
      template.children,
    ]);
  }

  visitContent(content: t.Content) {
    this.result.push(['Content', humanizeSpan(content.sourceSpan)]);
    t.visitAll(this, content.attributes);
  }

  visitVariable(variable: t.Variable) {
    this.result.push(
        ['Variable', humanizeSpan(variable.sourceSpan), humanizeSpan(variable.valueSpan)]);
  }

  visitReference(reference: t.Reference) {
    this.result.push(
        ['Reference', humanizeSpan(reference.sourceSpan), humanizeSpan(reference.valueSpan)]);
  }

  visitTextAttribute(attribute: t.TextAttribute) {
    this.result.push(
        ['TextAttribute', humanizeSpan(attribute.sourceSpan), humanizeSpan(attribute.valueSpan)]);
  }

  visitBoundAttribute(attribute: t.BoundAttribute) {
    this.result.push(
        ['BoundAttribute', humanizeSpan(attribute.sourceSpan), humanizeSpan(attribute.valueSpan)]);
  }

  visitBoundEvent(event: t.BoundEvent) {
    this.result.push(
        ['BoundEvent', humanizeSpan(event.sourceSpan), humanizeSpan(event.handlerSpan)]);
  }

  visitText(text: t.Text) {
    this.result.push(['Text', humanizeSpan(text.sourceSpan)]);
  }

  visitBoundText(text: t.BoundText) {
    this.result.push(['BoundText', humanizeSpan(text.sourceSpan)]);
  }

  visitIcu(icu: t.Icu) {
    return null;
  }

  private visitAll(nodes: t.Node[][]) {
    nodes.forEach(node => t.visitAll(this, node));
  }
}

function humanizeSpan(span: ParseSourceSpan|null|undefined): string {
  if (span === null || span === undefined) {
    return `<empty>`;
  }
  return span.toString();
}

function expectFromHtml(html: string) {
  const res = parse(html);
  return expectFromR3Nodes(res.nodes);
}

function expectFromR3Nodes(nodes: t.Node[]) {
  const humanizer = new R3AstSourceSpans();
  t.visitAll(humanizer, nodes);
  return expect(humanizer.result);
}

describe('R3 AST source spans', () => {
  describe('nodes without binding', () => {
    it('is correct for text nodes', () => {
      expectFromHtml('a').toEqual([
        ['Text', 'a'],
      ]);
    });

    it('is correct for elements with attributes', () => {
      expectFromHtml('<div a="b"></div>').toEqual([
        ['Element', '<div a="b"></div>', '<div a="b">', '</div>'],
        ['TextAttribute', 'a="b"', 'b'],
      ]);
    });

    it('is correct for elements with attributes without value', () => {
      expectFromHtml('<div a></div>').toEqual([
        ['Element', '<div a></div>', '<div a>', '</div>'],
        ['TextAttribute', 'a', '<empty>'],
      ]);
    });
  });

  describe('bound text nodes', () => {
    it('is correct for bound text nodes', () => {
      expectFromHtml('{{a}}').toEqual([
        ['BoundText', '{{a}}'],
      ]);
    });
  });

  describe('bound attributes', () => {
    it('is correct for bound properties', () => {
      expectFromHtml('<div [someProp]="v"></div>').toEqual([
        ['Element', '<div [someProp]="v"></div>', '<div [someProp]="v">', '</div>'],
        ['BoundAttribute', '[someProp]="v"', 'v'],
      ]);
    });

    it('is correct for bound properties without value', () => {
      expectFromHtml('<div [someProp]></div>').toEqual([
        ['Element', '<div [someProp]></div>', '<div [someProp]>', '</div>'],
        ['BoundAttribute', '[someProp]', '<empty>'],
      ]);
    });

    it('is correct for bound properties via bind- ', () => {
      expectFromHtml('<div bind-prop="v"></div>').toEqual([
        ['Element', '<div bind-prop="v"></div>', '<div bind-prop="v">', '</div>'],
        ['BoundAttribute', 'bind-prop="v"', 'v'],
      ]);
    });

    it('is correct for bound properties via {{...}}', () => {
      expectFromHtml('<div prop="{{v}}"></div>').toEqual([
        ['Element', '<div prop="{{v}}"></div>', '<div prop="{{v}}">', '</div>'],
        ['BoundAttribute', 'prop="{{v}}"', '{{v}}'],
      ]);
    });
  });

  describe('templates', () => {
    it('is correct for * directives', () => {
      expectFromHtml('<div *ngIf></div>').toEqual([
        ['Template', '<div *ngIf></div>', '<div *ngIf>', '</div>'],
        ['TextAttribute', 'ngIf', '<empty>'],
        ['Element', '<div *ngIf></div>', '<div *ngIf>', '</div>'],
      ]);
    });

    it('is correct for <ng-template>', () => {
      expectFromHtml('<ng-template></ng-template>').toEqual([
        ['Template', '<ng-template></ng-template>', '<ng-template>', '</ng-template>'],
      ]);
    });

    it('is correct for reference via #...', () => {
      expectFromHtml('<ng-template #a></ng-template>').toEqual([
        ['Template', '<ng-template #a></ng-template>', '<ng-template #a>', '</ng-template>'],
        ['Reference', '#a', '<empty>'],
      ]);
    });

    it('is correct for reference with name', () => {
      expectFromHtml('<ng-template #a="b"></ng-template>').toEqual([
        [
          'Template', '<ng-template #a="b"></ng-template>', '<ng-template #a="b">', '</ng-template>'
        ],
        ['Reference', '#a="b"', 'b'],
      ]);
    });

    it('is correct for reference via ref-...', () => {
      expectFromHtml('<ng-template ref-a></ng-template>').toEqual([
        ['Template', '<ng-template ref-a></ng-template>', '<ng-template ref-a>', '</ng-template>'],
        ['Reference', 'ref-a', '<empty>'],
      ]);
    });

    it('is correct for variables via let-...', () => {
      expectFromHtml('<ng-template let-a="b"></ng-template>').toEqual([
        [
          'Template', '<ng-template let-a="b"></ng-template>', '<ng-template let-a="b">',
          '</ng-template>'
        ],
        ['Variable', 'let-a="b"', 'b'],
      ]);
    });

    it('is correct for attributes', () => {
      expectFromHtml('<ng-template k1="v1"></ng-template>').toEqual([
        [
          'Template', '<ng-template k1="v1"></ng-template>', '<ng-template k1="v1">',
          '</ng-template>'
        ],
        ['TextAttribute', 'k1="v1"', 'v1'],
      ]);
    });

    it('is correct for bound attributes', () => {
      expectFromHtml('<ng-template [k1]="v1"></ng-template>').toEqual([
        [
          'Template', '<ng-template [k1]="v1"></ng-template>', '<ng-template [k1]="v1">',
          '</ng-template>'
        ],
        ['BoundAttribute', '[k1]="v1"', 'v1'],
      ]);
    });
  });

  // TODO(joost): improve spans of nodes extracted from macrosyntax
  describe('inline templates', () => {
    it('is correct for attribute and bound attributes', () => {
      // Desugared form is
      // <ng-template ngFor [ngForOf]="items" let-item>
      //   <div></div>
      // </ng-template>
      expectFromHtml('<div *ngFor="let item of items"></div>').toEqual([
        [
          'Template', '<div *ngFor="let item of items"></div>', '<div *ngFor="let item of items">',
          '</div>'
        ],
        ['TextAttribute', 'ngFor', '<empty>'],
        ['BoundAttribute', '*ngFor="let item of items"', 'items'],
        ['Variable', 'let item ', '<empty>'],
        [
          'Element', '<div *ngFor="let item of items"></div>', '<div *ngFor="let item of items">',
          '</div>'
        ],
      ]);

      // Note that this test exercises an *incorrect* usage of the ngFor
      // directive. There is a missing 'let' in the beginning of the expression
      // which causes the template to be desugared into
      // <ng-template [ngFor]="item" [ngForOf]="items">
      //   <div></div>
      // </ng-template>
      expectFromHtml('<div *ngFor="item of items"></div>').toEqual([
        [
          'Template', '<div *ngFor="item of items"></div>', '<div *ngFor="item of items">', '</div>'
        ],
        ['BoundAttribute', '*ngFor="item of items"', 'item'],
        ['BoundAttribute', '*ngFor="item of items"', 'items'],
        ['Element', '<div *ngFor="item of items"></div>', '<div *ngFor="item of items">', '</div>'],
      ]);
    });

    it('is correct for variables via let ...', () => {
      expectFromHtml('<div *ngIf="let a=b"></div>').toEqual([
        ['Template', '<div *ngIf="let a=b"></div>', '<div *ngIf="let a=b">', '</div>'],
        ['TextAttribute', 'ngIf', '<empty>'],
        ['Variable', 'let a=b', 'b'],
        ['Element', '<div *ngIf="let a=b"></div>', '<div *ngIf="let a=b">', '</div>'],
      ]);
    });

    it('is correct for variables via as ...', () => {
      expectFromHtml('<div *ngIf="expr as local"></div>').toEqual([
        ['Template', '<div *ngIf="expr as local"></div>', '<div *ngIf="expr as local">', '</div>'],
        ['BoundAttribute', '*ngIf="expr as local"', 'expr'],
        ['Variable', 'ngIf="expr as local', 'ngIf'],
        ['Element', '<div *ngIf="expr as local"></div>', '<div *ngIf="expr as local">', '</div>'],
      ]);
    });
  });

  describe('events', () => {
    it('is correct for event names case sensitive', () => {
      expectFromHtml('<div (someEvent)="v"></div>').toEqual([
        ['Element', '<div (someEvent)="v"></div>', '<div (someEvent)="v">', '</div>'],
        ['BoundEvent', '(someEvent)="v"', 'v'],
      ]);
    });

    it('is correct for bound events via on-', () => {
      expectFromHtml('<div on-event="v"></div>').toEqual([
        ['Element', '<div on-event="v"></div>', '<div on-event="v">', '</div>'],
        ['BoundEvent', 'on-event="v"', 'v'],
      ]);
    });

    it('is correct for bound events and properties via [(...)]', () => {
      expectFromHtml('<div [(prop)]="v"></div>').toEqual([
        ['Element', '<div [(prop)]="v"></div>', '<div [(prop)]="v">', '</div>'],
        ['BoundAttribute', '[(prop)]="v"', 'v'],
        ['BoundEvent', '[(prop)]="v"', 'v'],
      ]);
    });

    it('is correct for bound events and properties via bindon-', () => {
      expectFromHtml('<div bindon-prop="v"></div>').toEqual([
        ['Element', '<div bindon-prop="v"></div>', '<div bindon-prop="v">', '</div>'],
        ['BoundAttribute', 'bindon-prop="v"', 'v'],
        ['BoundEvent', 'bindon-prop="v"', 'v'],
      ]);
    });
  });

  describe('references', () => {
    it('is correct for references via #...', () => {
      expectFromHtml('<div #a></div>').toEqual([
        ['Element', '<div #a></div>', '<div #a>', '</div>'],
        ['Reference', '#a', '<empty>'],
      ]);
    });

    it('is correct for references with name', () => {
      expectFromHtml('<div #a="b"></div>').toEqual([
        ['Element', '<div #a="b"></div>', '<div #a="b">', '</div>'],
        ['Reference', '#a="b"', 'b'],
      ]);
    });

    it('is correct for references via ref-', () => {
      expectFromHtml('<div ref-a></div>').toEqual([
        ['Element', '<div ref-a></div>', '<div ref-a>', '</div>'],
        ['Reference', 'ref-a', '<empty>'],
      ]);
    });
  });
});
