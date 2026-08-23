import { angular } from '@angular-wave/angular.ts';

interface Task {
  id: number;
  title: string;
}

class TaskBoard {
  draft = '';
  nextId = 2;
  tasks: Task[] = [{ id: 1, title: 'Read the guide' }];

  add(): void {
    const title = this.draft.trim();
    if (!title) return;
    this.tasks = [...this.tasks, { id: this.nextId++, title }];
    this.draft = '';
  }
}

const { each } = angular.view;
const { tags } = angular;

angular.module('taskBoard', []).component<TaskBoard>('taskBoard', {
  controller: TaskBoard,
  view: ({ controller }) =>
    tags.main(
      tags.h1('Task board'),
      tags.form(
        {
          onsubmit: (event) => {
            event.preventDefault();
            controller.add();
          },
        },
        tags.label({ htmlFor: 'new-task' }, 'Task'),
        tags.input({
          id: 'new-task',
          value: () => controller.draft,
          oninput: (event) => {
            controller.draft = (event.currentTarget as HTMLInputElement).value;
          },
        }),
        tags.button({ disabled: () => !controller.draft.trim() }, 'Add'),
      ),
      tags.ul(
        each(
          () => controller.tasks,
          (task) => task.id,
          (task) => tags.li(() => task().title),
        ),
      ),
    ),
});
