"use client";

import * as React from "react";
import { motion, type HTMLMotionProps, type Variants } from "framer-motion";

/**
 * 자식 stagger 진입 애니메이션.
 *
 * 사용:
 * <StaggerList stagger={0.1}>
 *   <StaggerItem>...</StaggerItem>
 *   <StaggerItem>...</StaggerItem>
 * </StaggerList>
 *
 * StaggerList 자체가 스크롤 진입 트리거. 자식 StaggerItem은 부모 variants에 동기화됨.
 */
const containerVariants = (stagger: number, delayChildren: number): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: stagger,
      delayChildren,
    },
  },
});

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export interface StaggerListProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "whileInView" | "viewport" | "variants"> {
  stagger?: number;
  delayChildren?: number;
  once?: boolean;
}

export function StaggerList({
  stagger = 0.1,
  delayChildren = 0,
  once = true,
  children,
  ...rest
}: StaggerListProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      variants={containerVariants(stagger, delayChildren)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export type StaggerItemProps = Omit<HTMLMotionProps<"div">, "variants">;

export function StaggerItem({ children, ...rest }: StaggerItemProps) {
  return (
    <motion.div variants={itemVariants} {...rest}>
      {children}
    </motion.div>
  );
}
