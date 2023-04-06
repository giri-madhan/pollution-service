import express, { Request, Response } from 'express';

import { PollutionData } from '../models/pollution-data';
import { PredictionData } from '../models/prediction-data';
import { DataSource } from '../models/data-source';
import { body } from 'express-validator';
import { BadRequestError, currentUser, requireAuth } from '@airlifegoa/common';

const router = express.Router();

// url should contain optional query params pageNumber and pageSize
router.get('/api/pollution/dashboard/capital', async (req: Request, res: Response) => {
  
  // user should be either admin or dp-manager or creator of the data source
  // if not, throw an error
  // if (!req.currentUser.roles.admin
  //   && !req.currentUser.roles['manager']
  //   && !req.currentUser.roles['data-analyst']
  //   && !(req.currentUser.id in dataSource.admins)) {
  //   throw new BadRequestError('You do not have permission to view this data source');
  // }

  // get PageNumber and pageSize from query params
  // if not present, set default values
  // const pageNumber = req.query.page ? parseInt(req.query.page.toString()) : 1;
  // const pageSize = req.query.perPage ? parseInt(req.query.perPage.toString()) : 100;

  // get pollution data from database
  // filter duplicate data based on meta.addedAt and select one which is latest
  // use aggregation pipeline
  // sort in descending order of timestamp which is recordedAt field
  // skip and limit based on page number and page size
  // add id field which is _id field

  const panji_stattion_details = await DataSource.aggregate([
    {
      $match: {
        name: 'Panji',
      },
    },
  ]);
  console.log(panji_stattion_details);

  const pipeline: any = [
      {
        $match: {
          'metadata.dataSourceId': panji_stattion_details[0]._id,
        },
      },
      {
        $sort: {
          timestamp: -1,
        },
      },
      {
        $group: {
          _id: {
            timestamp: '$recordedAt',
            sourceId: '$metadata.sourceId',
          },
          data: {
            $first: '$$ROOT',
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: '$data',
        },
      },
      {
        $sort: {
          recordedAt: -1,
        },
      },
      {
        $limit: 7,
      },
  ];

  const highLowData = await PollutionData.aggregate(pipeline);
  // console.log(highLowData);
  const data: any = { AQI: [], data: {}, forecastsForTomorrow: {} };

  for (let i = 0; i < highLowData.length; i++) {
    data.AQI.push(highLowData[i].data.AQI);
  }
  data.data = highLowData[0].data;

  var tomorrow = new Date(new Date().setHours(0, 0, 0, 0));
  tomorrow = new Date(tomorrow.getTime() + 1000 * 60 * 30 * 59);
  var dayAfterTomorrow = new Date(tomorrow.getTime() + 1000 * 60 * 60 * 24);

  console.log(tomorrow, dayAfterTomorrow);
  const bestModel = 'prophet';

  const forecastsFOrTomorrow = await PredictionData.aggregate([
    {
      $match: {
        'metadata.dataSourceId': panji_stattion_details[0]._id,
        'metadata.modelName': bestModel,
        recordedAt: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow,
        },
      },
    },
  ]);
  console.log(forecastsFOrTomorrow);

    if (forecastsFOrTomorrow.length !==0){
        data.forecastsForTomorrow = forecastsFOrTomorrow[0].data;
    }
  res.status(200).send(data);
});

export { router as getCapitalDataRouter };