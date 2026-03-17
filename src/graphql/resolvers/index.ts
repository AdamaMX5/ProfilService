import { globalProfileResolvers } from './globalProfile.js'
import { virtualOfficeProfileResolvers } from './virtualOfficeProfile.js'
import { freeSchoolProfileResolvers } from './freeSchoolProfile.js'

export const resolvers = {
  Query: {
    ...globalProfileResolvers.Query,
    ...virtualOfficeProfileResolvers.Query,
    ...freeSchoolProfileResolvers.Query,
  },
  Mutation: {
    ...globalProfileResolvers.Mutation,
    ...virtualOfficeProfileResolvers.Mutation,
    ...freeSchoolProfileResolvers.Mutation,
  },
}
