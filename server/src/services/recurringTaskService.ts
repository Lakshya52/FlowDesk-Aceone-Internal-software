import Assignment from '../models/Assignment';
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
            // We'll look for the most recent child assignment
            const lastChild = await Assignment.findOne({
                 parentAssignmentId: template._id 
            }).sort({ startDate: -1 });

            let shouldSpawn = false;
            let nextStartDate = new Date(template.recurringStartDate!);
            
            if (!lastChild) {
                // Never spawned before, and we are past start date
                shouldSpawn = true;
                // nextStartDate remains as recurringStartDate
            } else {
                // Calculate next date based on last child
                const lastDate = new Date(lastChild.startDate);
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

                if (nextStartDate <= today) {
                    shouldSpawn = true;
                }
            }

            if (shouldSpawn) {
                // Calculate due date based on the duration of the template
                const templateStart = new Date(template.startDate);
                const templateDue = new Date(template.dueDate);
                const durationMs = templateDue.getTime() - templateStart.getTime();
                
                const newDueDate = new Date(nextStartDate.getTime() + durationMs);

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
                    isRecurring: false, // Instances are not themselves templates
                    parentAssignmentId: template._id,
                });

                await newAssignment.save();
                console.log(`[Recurring] Spawned new assignment "${newAssignment.title}" from template ${template._id}`);
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
