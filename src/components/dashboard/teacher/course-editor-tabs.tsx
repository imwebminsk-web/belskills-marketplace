"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { TaxonomyRow } from "@/app/actions/taxonomy-actions";
import {
  CurriculumTab,
  type CurriculumModuleRow,
} from "./curriculum-tab";
import {
  CourseSettingsForm,
  type CourseSettingsFormCourse,
} from "./course-settings-form";

export function CourseEditorTabs({
  course,
  modules,
  canCreateStructure,
  taxonomies = [],
}: {
  course: CourseSettingsFormCourse;
  modules: CurriculumModuleRow[];
  canCreateStructure: boolean;
  taxonomies?: TaxonomyRow[];
}) {
  return (
    <Tabs defaultValue="settings" className="w-full gap-6">
      <TabsList variant="line" className="h-auto w-full flex-wrap justify-start">
        <TabsTrigger value="settings">Настройки</TabsTrigger>
        <TabsTrigger value="curriculum">Программа</TabsTrigger>
        <TabsTrigger value="students">Ученики</TabsTrigger>
      </TabsList>
      <TabsContent value="settings" className="mt-4 flex-none">
        <CourseSettingsForm
          mode="edit"
          course={course}
          taxonomies={taxonomies}
          key={course.id}
        />
      </TabsContent>
      <TabsContent value="curriculum" className="mt-4 flex-none">
        <CurriculumTab
          courseId={course.id}
          courseSlug={course.slug}
          modules={modules}
          canCreateStructure={canCreateStructure}
        />
      </TabsContent>
      <TabsContent value="students" className="mt-4 flex-none">
        <Card>
          <CardHeader>
            <CardTitle>Ученики</CardTitle>
            <CardDescription>Список учеников.</CardDescription>
          </CardHeader>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
