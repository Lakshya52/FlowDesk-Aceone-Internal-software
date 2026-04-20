import Assignment from '../models/Assignment';
import Task from '../models/Task';
import mongoose from 'mongoose';

export const processRecurringAssignments = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all root recurring assignments
        // For simplicity, we assume an assignment with isRecurring: true and parentAssignmentId: null is a template/root
        const templates = await Assignment.find({
            isRecurring: true,
            parentAssignmentId: null,
            recurringStartDate: { $lte: new Date() }
        });

        for (const template of templates) {
            // Check if we already spawned an assignment for the current cycle
            const lastChild = await Assignment.findOne({
                 parentAssignmentId: template._id 
            }).sort({ startDate: -1 });

            let shouldSpawn = false;
            let nextStartDate = new Date(template.recurringStartDate!);
            nextStartDate.setHours(0, 0, 0, 0);
            
            if (!lastChild) {
                // Never spawned before, and we are past or at start date
                if (nextStartDate <= today) {
                    shouldSpawn = true;
                }
            } else {
                // Calculate next date based on last child
                const lastDate = new Date(lastChild.startDate);
                lastDate.setHours(0, 0, 0, 0);
                nextStartDate = new Date(lastDate);

                if (template.recurringPattern === 'daily') {
                    nextStartDate.setDate(nextStartDate.getDate() + 1);
                } else if (template.recurringPattern === 'weekly') {
                    nextStartDate.setDate(nextStartDate.getDate() + 7);
                } else if (template.recurringPattern === 'monthly') {
                    nextStartDate.setMonth(nextStartDate.getMonth() + 1);
                } else if (template.recurringPattern === 'yearly') {
                    nextStartDate.setFullYear(nextStartDate.getFullYear() + 1);
                }

                // If nextStartDate is today or in the past, spawn it
                if (nextStartDate <= today) {
                    shouldSpawn = true;
                }
            }

            if (shouldSpawn) {
                // Calculate due date based on the duration of the template
                let newDueDate = null;
                if (template.startDate && template.dueDate) {
                    const templateStart = new Date(template.startDate);
                    const templateDue = new Date(template.dueDate);
                    
                    // Only calculate if templateDue is valid and after templateStart
                    if (templateDue.getFullYear() > 1970) {
                        const durationMs = templateDue.getTime() - templateStart.getTime();
                        newDueDate = new Date(nextStartDate.getTime() + durationMs);
                    }
                }

                // Create new instance
                const newAssignment = new Assignment({
                    title: template.title,
                    clientName: template.clientName,
                    companyId: template.companyId,
                    description: template.description,
                    priority: template.priority,
                    status: 'not_started',
                    startDate: nextStartDate,
                    dueDate: newDueDate,
                    createdBy: template.createdBy,
                    team: template.team,
                    teams: template.teams,
                    isRecurring: false, 
                    parentAssignmentId: template._id,
                });

                await newAssignment.save();

                // Clone tasks from template to new instance
                const templateTasks = await Task.find({ assignment: template._id });
                if (templateTasks.length > 0) {
                    const clonedTasks = templateTasks.map(t => ({
                        title: t.title,
                        description: t.description,
                        assignment: newAssignment._id,
                        assignedTo: t.assignedTo,
                        createdBy: t.createdBy,
                        dueDate: newDueDate, // Optionally set task due date to match assignment due date
                        priority: t.priority,
                        status: 'todo',
                        subtasks: t.subtasks.map(s => ({ title: s.title, completed: false })),
                        dependencies: [], // Reset dependencies for now as they relate to specific task IDs
                    }));
                    await Task.insertMany(clonedTasks);
                    console.log(`[Recurring] Cloned ${templateTasks.length} tasks to "${newAssignment.title}"`);
                }

                console.log(`[Recurring] Spawned new assignment "${newAssignment.title}" for date ${nextStartDate.toDateString()} from template ${template._id}`);
            }
        }
    } catch (error) {
        console.error('[Recurring] Error processing recurring assignments:', error);
    }
};

// Start the background job
export const startRecurringJob = () => {
    // Run once on start
    processRecurringAssignments();
    
    // Then run every hour
    setInterval(processRecurringAssignments, 1000 * 60 * 60);
};
