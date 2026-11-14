import React, { useState } from 'react';
import type { SignageGalleryImage } from '@/hooks/useSignageGallery';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/enhanced-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Eye, Check, Trash2, Tag, Plus, Loader2 } from 'lucide-react';
import styles from './SignageGalleryModal.module.css';

import { thumbnailUrlFor } from '@/lib/imagePipeline';
import { SignageLibraryImage } from './SignageLibraryImage';
interface CardProps {
 image: SignageGalleryImage; selected: boolean; isAdmin: boolean; categoriesWithCounts: {name:string;count:number}[];
 onView:(image:SignageGalleryImage)=>void; onSelect:(image:SignageGalleryImage)=>void; onDelete:(image:SignageGalleryImage)=>void;
 onCategoryChange:(image:SignageGalleryImage,name:string)=>Promise<boolean>;
}
export const SignageGalleryCard = React.memo(function SignageGalleryCard({ image,selected,isAdmin,categoriesWithCounts,onView,onSelect,onDelete,onCategoryChange }:CardProps){
 const [categorizeOpen,setCategorizeOpen]=useState(false);
 const [categorizeMode,setCategorizeMode]=useState<'list'|'create'>('list');
 const [newCategoryName,setNewCategoryName]=useState('');
 const [assigningCategory,setAssigningCategory]=useState(false);
 const handleAssignCategory=async(image:SignageGalleryImage,name:string)=>{
  if(assigningCategory||!name.trim())return;
  setAssigningCategory(true);
  try{if(await onCategoryChange(image,name)){setCategorizeOpen(false);setCategorizeMode('list');setNewCategoryName('');}}
  finally{setAssigningCategory(false);}
 };
 return (<div
                        key={image.id}
                        className={`${styles.templateCard} ${selected ? styles.templateCardSelected : ''}`}
                      >
                        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                          <SignageLibraryImage key={image.thumbnail_url || image.image_url}
                            src={image.thumbnail_url || image.preview_url || thumbnailUrlFor(image.image_url) || image.image_url}
                            fallback={image.preview_url || image.image_url} alt={image.name} className="h-full w-full object-contain" />
                        </div>
                        <div className="border-t border-border bg-white px-2 py-1.5">
                          <p className={`${styles.templateName} truncate text-xs font-semibold text-foreground`} title={image.name}>{image.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 border-t border-border bg-white p-1.5">
                          <button
                            onClick={() => onView(image)}
                            className={styles.cardAction}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => onSelect(image)}
                            className={`${styles.cardAction} ${styles.selectAction}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Select
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => onDelete(image)}
                              className={`${styles.cardAction} ${styles.deleteAction}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                          {isAdmin && (
                            <Popover
                              open={categorizeOpen}
                              onOpenChange={(o) => {
                                setCategorizeOpen(o);
                                if (!o) { setCategorizeMode('list'); setNewCategoryName(''); }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className={`${styles.cardAction} ${styles.categorizeAction}`}
                                >
                                  <Tag className="h-3.5 w-3.5" />
                                  Categorize
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className={`${styles.portal} w-64 p-2 z-[130]`}
                                align="center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {categorizeOpen && (categorizeMode === 'list' ? (
                                  <>
                                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                      Assign to category
                                    </div>
                                    <div
                                      className="max-h-56 overflow-y-auto overscroll-contain"
                                      onWheel={(e) => {
                                        const el = e.currentTarget;
                                        if (el.scrollHeight > el.clientHeight) {
                                          el.scrollTop += e.deltaY;
                                          e.stopPropagation();
                                        }
                                      }}
                                    >
                                      {categoriesWithCounts.length === 0 && (
                                        <div className="px-2 py-2 text-xs text-muted-foreground">No categories yet</div>
                                      )}
                                      {categoriesWithCounts.map(({ name, count }) => {
                                        const isCurrent = image.categories.includes(name);
                                        return (
                                          <button
                                            key={name}
                                            disabled={assigningCategory || isCurrent}
                                            onClick={() => handleAssignCategory(image, name)}
                                            className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md text-left hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed ${isCurrent ? 'bg-muted/60' : ''}`}
                                          >
                                            <span className="truncate">{name}</span>
                                            <span className={`${styles.compactIndicator} text-xs text-muted-foreground`}>{count}{isCurrent ? ' ✓' : ''}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <div className="border-t border-border my-1" />
                                    <button
                                      onClick={() => { setCategorizeMode('create'); setNewCategoryName(''); }}
                                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md text-left text-primary hover:bg-muted"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      Create New Category
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col gap-2 p-1">
                                    <label className="text-xs font-semibold text-muted-foreground">New category name</label>
                                    <Input
                                      autoFocus
                                      value={newCategoryName}
                                      onChange={(e) => setNewCategoryName(e.target.value)}
                                      placeholder="e.g. Welcome Sign"
                                      className="h-9"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCategoryName.trim()) {
                                          e.preventDefault();
                                          handleAssignCategory(image, newCategoryName);
                                        }
                                      }}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="lv-premium-shade"
                                        disabled={assigningCategory}
                                        onClick={() => { setCategorizeMode('list'); setNewCategoryName(''); }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white lv-premium-shade"
                                        disabled={assigningCategory || !newCategoryName.trim()}
                                        onClick={() => handleAssignCategory(image, newCategoryName)}
                                      >
                                        {assigningCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </div>);
});
