import { angular, button, each, form, h1, input, label, li, main, ul, } from '@angular-wave/angular.ts';
class TaskBoard {
    draft = '';
    nextId = 2;
    tasks = [{ id: 1, title: 'Read the guide' }];
    add() {
        const title = this.draft.trim();
        if (!title)
            return;
        this.tasks = [...this.tasks, { id: this.nextId++, title }];
        this.draft = '';
    }
}
angular.createModule('taskBoard', []).component('taskBoard', {
    controller: TaskBoard,
    view: ({ controller }) => main(h1('Task board'), form({
        onsubmit: (event) => {
            event.preventDefault();
            controller.add();
        },
    }, label({ htmlFor: 'new-task' }, 'Task'), input({
        id: 'new-task',
        value: () => controller.draft,
        oninput: (event) => {
            controller.draft = event.currentTarget.value;
        },
    }), button({ disabled: () => !controller.draft.trim() }, 'Add')), ul(each(() => controller.tasks, (task) => task.id, (task) => li(() => task().title)))),
});
